export interface BenchmarkTrack {
  id: string; // YouTube Video ID
  title: string;
  artist: string;
  category: 'short' | 'standard' | 'long' | 'mix';
  durationSec: number;
  description: string;
}

export const BENCHMARK_TRACKS: BenchmarkTrack[] = [
  {
    id: 'L_LUpnjgPso',
    title: 'We Will Rock You',
    artist: 'Queen',
    category: 'short',
    durationSec: 134,
    description: 'Canción corta (~2m), rock clásico, alta disponibilidad',
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    category: 'standard',
    durationSec: 213,
    description: 'Canción estándar (~3.5m), pop clásico, CDN ultra-caliente',
  },
  {
    id: 'XFkzRNyygfk',
    title: 'Creep',
    artist: 'Radiohead',
    category: 'standard',
    durationSec: 239,
    description: 'Canción estándar (~4m), rock alternativo (referencia en curl-timing.sh)',
  },
  {
    id: '9bZkp7q19f0',
    title: 'Gangnam Style',
    artist: 'PSY',
    category: 'standard',
    durationSec: 252,
    description: 'Canción estándar (~4.2m), K-pop, multi-stream CDN',
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Despacito ft. Daddy Yankee',
    artist: 'Luis Fonsi',
    category: 'standard',
    durationSec: 282,
    description: 'Canción estándar (~4.7m), pop urbano latino',
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    category: 'standard',
    durationSec: 359,
    description: 'Canción estándar-larga (~6m), rock sinfónico con cambios dinámicos',
  },
  {
    id: 'QkF3oxziUI4',
    title: 'Stairway to Heaven',
    artist: 'Led Zeppelin',
    category: 'long',
    durationSec: 482,
    description: 'Canción larga (~8m), rock progresivo clásico',
  },
  {
    id: '8Pa9x9fZBtY',
    title: 'Sultans Of Swing (Alchemy Live)',
    artist: 'Dire Straits',
    category: 'long',
    durationSec: 667,
    description: 'Canción larga (~11m), directo extendido',
  },
  {
    id: 'bM7SZ5SBzyY',
    title: 'Echoes (Live at Pompeii)',
    artist: 'Pink Floyd',
    category: 'long',
    durationSec: 990,
    description: 'Canción muy larga (~16.5m), suite psicodélica',
  },
  {
    id: 'TURbeWK2wwg',
    title: 'Lofi Hip Hop Chill Beats - Study Mix',
    artist: 'Lofi Girl / Chillhop',
    category: 'mix',
    durationSec: 1800,
    description: 'Mix continuo (~30m), caso de estrés para streaming/range-requests',
  },
];

export default BENCHMARK_TRACKS;
