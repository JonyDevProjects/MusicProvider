import express from 'express';
import cors from 'cors';
import { search, getStreamInfo, getPlaylistInfo, downloadTrack } from './ytdlpWrapper.js';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Falta el parámetro de búsqueda "q"' });
    }

    const results = await search(query, limit);
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

app.listen(PORT, () => {
  console.log(`🚀 MusicProvider Server corriendo en http://localhost:${PORT}`);
});
