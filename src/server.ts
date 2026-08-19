import express from 'express';
import cors from 'cors';
import {
  defaultStreamCache,
  DEFAULT_CACHE_TTL,
  type StreamData,
  type SearchResult,
  type PlaylistData
} from './core/index.js';
import { search, getStreamInfo, getPlaylistInfo, downloadTrack } from './ytdlpWrapper.js';
import { resolveStreamInfo } from './streamCache.js';
import path from 'path';
import { pathToFileURL } from 'url';
import https from 'https';
import http from 'http';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// HTTP agents with Keep-Alive to reuse TCP/TLS connections to the YouTube CDN.
// This avoids a full TCP handshake + TLS negotiation on every chunk request,
// significantly reducing latency for seeking and range requests.
const httpsAgent = new https.Agent({ keepAlive: true });
const httpAgent = new http.Agent({ keepAlive: true });

export const CACHE_TTL = DEFAULT_CACHE_TTL;
export const streamUrlCache = defaultStreamCache;

async function getCachedStreamInfo(videoId: string): Promise<StreamData> {
  return resolveStreamInfo(videoId, getStreamInfo);
}

// Configurable static directory for Flutter web build (allows test fixtures)
const WEB_BUILD_DIR = process.env.WEB_BUILD_DIR || path.join(process.cwd(), 'Spoti5_app', 'build', 'web');
app.use(express.static(WEB_BUILD_DIR));

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Falta el parámetro de búsqueda "q"' });
    }

    const results = await search(query, limit);

    // Background warmup: asynchronously pre-resolve stream URLs for the top 3
    // results so the cache is populated before the client requests playback.
    // This is fire-and-forget — it must NOT block the search response.
    const warmupCount = Math.min(3, results.length);
    for (let i = 0; i < warmupCount; i++) {
      const videoId = results[i].id;
      getCachedStreamInfo(videoId).catch(err => {
        console.error(`[search] Background warmup failed for ${videoId}:`, err.message);
      });
    }

    res.json(results);
  } catch (error: any) {
    console.error('Error en /api/search:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/info', async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'Falta el parámetro "url"' });
    }

    const info = await getStreamInfo(url);
    res.json(info);
  } catch (error: any) {
    console.error('Error en /api/info:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/audio/resolve', async (req, res) => {
  try {
    const videoId = req.query.videoId as string;
    if (!videoId) {
      return res.status(400).json({ error: 'Falta el parámetro "videoId"' });
    }

    // Resolves and caches the stream URL in one call
    const info = await getCachedStreamInfo(videoId);
    res.json({
      streamUrl: info.streamUrl,
      duration: info.duration,
      title: info.title,
      container: info.container,
      codec: info.codec
    });
  } catch (error: any) {
    console.error('Error en /api/audio/resolve:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/audio/stream', async (req, res) => {
  try {
    const videoId = req.query.videoId as string;
    if (!videoId) {
      return res.status(400).json({ error: 'Falta el parámetro "videoId"' });
    }

    // 1. Obtener URL directa del CDN (usando cache para evitar llamadas repetidas de yt-dlp)
    const info = await getCachedStreamInfo(videoId);
    const targetUrl = info.streamUrl;

    // 2. Opciones para el fetch, enviando Range header para permitir seeking (AVPlayer lo necesita)
    // YouTube CDN rechaza requests sin Range (HTTP 403). Si el cliente no envía Range,
    // solicitamos desde el byte 0 hasta el final (equivalente a full file, pero con 206).
    const rangeHeader = req.headers.range || 'bytes=0-';

    const hopByHopHeaders = new Set([
      'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
      'te', 'trailers', 'transfer-encoding', 'upgrade',
    ]);

    let currentProxyReq: http.ClientRequest | undefined;

    req.on('close', () => {
      console.log(`[stream] Cliente cerró la conexión para ${videoId}. Cancelando proxyReq...`);
      if (currentProxyReq) currentProxyReq.destroy();
    });

    const makeRequest = (targetUrl: string, isRetry = false) => {
      const client = targetUrl.startsWith('https') ? https : http;
      const agent = targetUrl.startsWith('https') ? httpsAgent : httpAgent;

      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Range': rangeHeader
        },
        agent: agent,
      };

      const proxyReq = client.get(targetUrl, options, async (proxyRes) => {
        if (proxyRes.statusCode === 403 && !isRetry) {
          console.warn(`[stream] URL caducada o Forbidden (403) para ${videoId}. Regenerando stream...`);
          defaultStreamCache.delete(videoId);
          try {
            const newInfo = await getCachedStreamInfo(videoId);
            console.log(`[stream] Stream regenerado con éxito para ${videoId}. Reintentando proxy...`);
            proxyReq.destroy();
            makeRequest(newInfo.streamUrl, true);
            return;
          } catch (refreshErr: any) {
            console.error(`[stream] Falló la regeneración para ${videoId}:`, refreshErr.message);
            if (!res.headersSent) {
              res.status(403).json({ error: 'URL caducada y fallo al regenerar' });
            } else {
              res.end();
            }
            return;
          }
        }

        if (res.headersSent) {
          console.warn(`[stream] Headers ya enviados para ${videoId}, procediendo con precaución.`);
        } else {
          res.status(proxyRes.statusCode || 200);
          Object.keys(proxyRes.headers).forEach(key => {
            if (!hopByHopHeaders.has(key.toLowerCase())) {
              res.setHeader(key, proxyRes.headers[key] as string | string[]);
            }
          });
          if (!proxyRes.headers['content-type']) {
            res.setHeader('Content-Type', 'audio/mp4');
          }
          res.setHeader('Accept-Ranges', 'bytes');
          if (proxyRes.headers['content-length']) {
            res.setHeader('Content-Length', proxyRes.headers['content-length'] as string);
          }
          if (proxyRes.headers['content-range']) {
            res.setHeader('Content-Range', proxyRes.headers['content-range'] as string);
          }
        }

        proxyRes.pipe(res);

        proxyRes.on('error', (err) => {
          console.error(`[stream] Error leyendo del CDN para ${videoId}:`, err.message);
          res.end();
        });

        proxyRes.on('end', () => {
          console.log(`[stream] Descarga desde CDN completada para ${videoId}`);
        });
      });

      proxyReq.on('error', (err) => {
        console.error(`[stream] Error de conexión al CDN para ${videoId}:`, err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Bad Gateway: No se pudo conectar al CDN' });
        } else {
          res.end();
        }
      });

      currentProxyReq = proxyReq;
    };

    makeRequest(targetUrl);

  } catch (error: any) {
    console.error('Error en /api/audio/stream:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.get('/api/playlist', async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'Falta el parámetro "url"' });
    }

    const playlist = await getPlaylistInfo(url);
    res.json(playlist);
  } catch (error: any) {
    console.error('Error en /api/playlist:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Falta el parámetro "url" en el body' });
    }

    const outputDir = path.join(process.cwd(), 'downloads');
    const filePath = await downloadTrack(url, outputDir);
    res.json({ message: 'Descarga completada', filePath });
  } catch (error: any) {
    console.error('Error en /api/download:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Export app and cache for testing (supertest) and cache tests
export { app, getCachedStreamInfo, WEB_BUILD_DIR, httpsAgent, httpAgent };

// Only start the server when this module is the entry point
const isMainModule = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isMainModule) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MusicProvider Server corriendo en http://0.0.0.0:${PORT}`);
  });
}
