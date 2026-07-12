#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import { ensureInstalled, PROJECT_ROOT } from './ytdlpSetup.js';
import { search, getStreamInfo, getPlaylistInfo, downloadTrack } from './ytdlpWrapper.js';

const program = new Command();

program
  .name('music-provider')
  .description('Standalone Music Provider exploiting yt-dlp (Nuclear-inspired)')
  .version('1.0.0');

program
  .command('setup')
  .description('Descarga, instala o actualiza el binario de yt-dlp')
  .action(async () => {
    try {
      console.log('Verificando/instalando el binario yt-dlp de forma autónoma...');
      const updated = await ensureInstalled();
      console.log(updated ? '\nyt-dlp verificado y actualizado con éxito.' : '\nyt-dlp descargado e instalado con éxito.');
    } catch (err: any) {
      console.error('\nError durante la instalación:', err.message);
      process.exit(1);
    }
  });

program
  .command('search <query>')
  .description('Busca canciones en YouTube')
  .option('-l, --limit <number>', 'Límite de resultados de búsqueda', '10')
  .action(async (query, options) => {
    try {
      await ensureInstalled();
      const limit = parseInt(options.limit, 10);
      const results = await search(query, limit);
      console.log(`\nResultados de búsqueda para: "${query}"`);
      console.log('==================================================');
      results.forEach((r, idx) => {
        const durationStr = r.duration 
          ? `${Math.floor(r.duration / 60)}:${String(Math.floor(r.duration % 60)).padStart(2, '0')}` 
          : 'N/A';
        console.log(`${idx + 1}. [ID: ${r.id}] ${r.title}`);
        console.log(`   Canal: ${r.channel || 'N/A'} | Duración: ${durationStr}\n`);
      });
    } catch (err: any) {
      console.error('\nError durante la búsqueda:', err.message);
      process.exit(1);
    }
  });

program
  .command('stream <videoId>')
  .description('Extrae información del stream de audio directo para un video o canción')
  .action(async (videoId) => {
    try {
      await ensureInstalled();
      const info = await getStreamInfo(videoId);
      console.log('\nInformación del stream extraído:');
      console.log('==================================================');
      console.log(`- Título: ${info.title || 'N/A'}`);
      console.log(`- Duración: ${info.duration ? info.duration + ' segundos' : 'N/A'}`);
      console.log(`- Formato/Contenedor: ${info.container || 'N/A'}`);
      console.log(`- Codec de audio: ${info.codec || 'N/A'}`);
      console.log(`- URL del stream (Vence temporalmente):\n${info.streamUrl}`);
    } catch (err: any) {
      console.error('\nError al extraer información del stream:', err.message);
      process.exit(1);
    }
  });

program
  .command('playlist <url>')
  .description('Extrae las canciones y metadatos de una lista de reproducción por URL')
  .action(async (url) => {
    try {
      await ensureInstalled();
      const info = await getPlaylistInfo(url);
      console.log(`\nLista de Reproducción: "${info.title}" [ID: ${info.id}]`);
      console.log('==================================================');
      console.log(`Total de pistas encontradas: ${info.entries.length}\n`);
      info.entries.forEach((e, idx) => {
        const durationStr = e.duration 
          ? `${Math.floor(e.duration / 60)}:${String(Math.floor(e.duration % 60)).padStart(2, '0')}` 
          : 'N/A';
        console.log(`${idx + 1}. [ID: ${e.id}] ${e.title}`);
        console.log(`   Canal: ${e.channel || 'N/A'} | Duración: ${durationStr}\n`);
      });
    } catch (err: any) {
      console.error('\nError al procesar la lista de reproducción:', err.message);
      process.exit(1);
    }
  });

program
  .command('download <videoIdOrUrl>')
  .description('Descarga el stream de audio directo de una canción en formato nativo (.m4a/.webm)')
  .option('-o, --out <dir>', 'Directorio de descarga del archivo de audio', path.join(PROJECT_ROOT, 'downloads'))
  .action(async (videoIdOrUrl, options) => {
    try {
      await ensureInstalled();
      const outDir = path.resolve(options.out);
      console.log(`Directorio destino de descarga: ${outDir}\n`);

      const filePath = await downloadTrack(videoIdOrUrl, outDir, (progressLine) => {
        const line = progressLine.trim();
        if (line.includes('[download]') && line.includes('%')) {
          process.stdout.write(`\r${line}`);
        } else if (line.length > 0) {
          console.log(line);
        }
      });

      console.log(`\n\n[Éxito] Descarga completada. Archivo guardado en:\n${filePath}`);
    } catch (err: any) {
      console.error('\n\nError durante la descarga:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
