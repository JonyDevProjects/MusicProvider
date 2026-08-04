import express from 'express';
import cors from 'cors';
import { search, getStreamInfo, getPlaylistInfo, downloadTrack } from './ytdlpWrapper.js';
import type { YtdlpStreamInfo } from './ytdlpWrapper.js';
import path from 'path';
import https from 'https';
import http from 'http';
import { LRUCache } from 'lru-cache';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// LRU cache for yt-dlp resolved stream URLs.
// YouTube CDN URLs are valid for ~5-15 minutes, so a 5-minute TTL is safe.
// max: 100 entries prevents unbounded memory growth (memory leak fix).
// ttl: entries auto-expire after the TTL without manual cleanup.
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const streamUrlCache = new LRUCache<string, YtdlpStreamInfo>({
  max: 100,
  ttl: CACHE_TTL,
});

// HTTP agents with Keep-Alive to reuse TCP/TLS connections to the YouTube CDN.
// This avoids a full TCP handshake + TLS negotiation on every chunk request,
// significantly reducing latency for seeking and range requests.
const httpsAgent = new https.Agent({ keepAlive: true });
const httpAgent = new http.Agent({ keepAlive: true });

async function getCachedStreamInfo(videoId: string): Promise<YtdlpStreamInfo> {
  const cached = streamUrlCache.get(videoId);
  if (cached) {
    console.log(`[cache] Stream URL cache HIT for: ${videoId}`);
    return cached;
  }
  console.log(`[cache] Stream URL cache MISS for: ${videoId}, resolving via yt-dlp...`);
  const info = await getStreamInfo(videoId);
  streamUrlCache.set(videoId, info);
  return info;
}

// Servir la aplicación web de Flutter
app.use(express.static(path.join(process.cwd(), 'Spoti5_app', 'build', 'web')));

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
    const client = targetUrl.startsWith('https') ? https : http;
    const agent = targetUrl.startsWith('https') ? httpsAgent : httpAgent;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Range': rangeHeader
      },
      // Reuse the TCP/TLS connection across chunk requests (keep-alive)
      agent: agent,
    };

    // Hop-by-hop headers must not be forwarded when proxying.
    const hopByHopHeaders = new Set([
      'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
      'te', 'trailers', 'transfer-encoding', 'upgrade',
    ]);

    // 3. Hacer request al CDN y pipear respuesta
    const proxyReq = client.get(targetUrl, options, (proxyRes) => {
      // Re-enviar status y headers del CDN al iPhone
      res.status(proxyRes.statusCode || 200);

      // Forward CDN headers, skipping hop-by-hop ones
      Object.keys(proxyRes.headers).forEach(key => {
        if (!hopByHopHeaders.has(key.toLowerCase())) {
          res.setHeader(key, proxyRes.headers[key] as string | string[]);
        }
      });

      // Ensure pristine Content-Type
      if (!proxyRes.headers['content-type']) {
        res.setHeader('Content-Type', 'audio/mp4');
      }

      // Ensure Accept-Ranges is always present for seeking support
      res.setHeader('Accept-Ranges', 'bytes');

      // Forward Content-Length and Content-Range explicitly if the CDN provided them
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length'] as string);
      }
      if (proxyRes.headers['content-range']) {
        res.setHeader('Content-Range', proxyRes.headers['content-range'] as string);
      }

      // Pipear los chunks de audio al cliente
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Error en proxyReq al CDN:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Bad Gateway: No se pudo conectar al CDN' });
      }
    });

    // Abortar request al CDN si el cliente (iPhone) cancela la conexión
    req.on('close', () => {
      proxyReq.destroy();
    });

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MusicProvider Server corriendo en http://0.0.0.0:${PORT}`);
});
