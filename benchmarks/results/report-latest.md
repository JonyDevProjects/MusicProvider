# Reporte de Benchmark — Fase 3.2 (API Model vs Integrated Plugin Model)

**Fecha de ejecución**: 2026-08-19T22:40:49.581Z
**Plataforma**: darwin (arm64) — Node v24.15.0 — OS 25.5.0
**Hardware**: Apple M1 Pro | RAM Total: 16384.00 MB

## 1. Modelo API (Express → resolveStreamInfo)

| Track | Run 1 (Cold) | Run 2 (Cold) | Run 3 (Cold) | p50 | p95 | p99 | Media | Warm Media | Notas |
|-------|--------------|--------------|--------------|-----|-----|-----|-------|------------|-------|
| Queen - We Will Rock You | 2.04 s | 2.02 s | 2.09 s | 2.04 s | 2.08 s | 2.09 s | 2.05 s | 0.05 ms | OK [short] |
| Rick Astley - Never Gonna Give You Up | 2.24 s | 2.95 s | 2.33 s | 2.33 s | 2.88 s | 2.93 s | 2.51 s | 0.02 ms | OK [standard] |
| Radiohead - Creep | 2.27 s | 2.32 s | 2.03 s | 2.27 s | 2.32 s | 2.32 s | 2.21 s | 0.02 ms | OK [standard] |
| PSY - Gangnam Style | 2.95 s | 2.61 s | 2.89 s | 2.89 s | 2.94 s | 2.95 s | 2.82 s | 0.02 ms | OK [standard] |
| Luis Fonsi - Despacito ft. Daddy Yankee | 2.32 s | 1.99 s | 2.12 s | 2.12 s | 2.30 s | 2.32 s | 2.15 s | 0.01 ms | OK [standard] |
| Queen - Bohemian Rhapsody | 2.33 s | 2.72 s | 2.47 s | 2.47 s | 2.69 s | 2.71 s | 2.51 s | 0.02 ms | OK [standard] |
| Led Zeppelin - Stairway to Heaven | 2.18 s | 2.05 s | 2.12 s | 2.12 s | 2.17 s | 2.18 s | 2.12 s | 0.01 ms | OK [long] |
| Dire Straits - Sultans Of Swing (Alchemy Live) | 2.10 s | 2.11 s | 1.95 s | 2.10 s | 2.10 s | 2.11 s | 2.05 s | 0.01 ms | OK [long] |
| Pink Floyd - Echoes (Live at Pompeii) | — | — | — | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | Error: yt-dlp failed: ERROR: [youtube] bM7SZ5SBzyY: Please sign in. Use --cookies-from-browser or --cookies for the authentication. See  https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp  for how to manually pass cookies. Also see  https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies  for tips on effectively exporting YouTube cookies
 |
| Lofi Girl / Chillhop - Lofi Hip Hop Chill Beats - Study Mix | 1.93 s | 2.44 s | 1.77 s | 1.93 s | 2.39 s | 2.43 s | 2.05 s | 0.02 ms | OK [mix] |

**Resumen Global API**:
- Cold Cache -> Media: **2.27 s** | p50: **2.18 s** | p95: **2.93 s** | p99: **2.95 s** | StdDev: 310.91 ms
- Warm Cache -> Media: **0.02 ms** | p50: **0.00 ms** | p95: **0.05 ms** | p99: **0.11 ms**

## 2. Modelo Integrado (Plugin JS → Nuclear getStreamUrl)

| Track | Run 1 (Cold) | Run 2 (Cold) | Run 3 (Cold) | p50 | p95 | p99 | Media | Warm Media | Notas |
|-------|--------------|--------------|--------------|-----|-----|-----|-------|------------|-------|
| Queen - We Will Rock You | 1.77 s | 1.94 s | 2.52 s | 1.94 s | 2.46 s | 2.50 s | 2.08 s | 0.02 ms | OK [short] |
| Rick Astley - Never Gonna Give You Up | 2.27 s | 2.21 s | 1.88 s | 2.21 s | 2.26 s | 2.26 s | 2.12 s | 0.02 ms | OK [standard] |
| Radiohead - Creep | 2.16 s | 2.03 s | 2.37 s | 2.16 s | 2.35 s | 2.37 s | 2.19 s | 0.01 ms | OK [standard] |
| PSY - Gangnam Style | 2.30 s | 2.14 s | 2.28 s | 2.28 s | 2.30 s | 2.30 s | 2.24 s | 0.01 ms | OK [standard] |
| Luis Fonsi - Despacito ft. Daddy Yankee | 1.98 s | 2.16 s | 2.02 s | 2.02 s | 2.15 s | 2.16 s | 2.05 s | 0.02 ms | OK [standard] |
| Queen - Bohemian Rhapsody | 2.37 s | 2.02 s | 2.54 s | 2.37 s | 2.53 s | 2.54 s | 2.31 s | 0.01 ms | OK [standard] |
| Led Zeppelin - Stairway to Heaven | 4.55 s | 2.08 s | 2.45 s | 2.45 s | 4.34 s | 4.51 s | 3.03 s | 0.01 ms | OK [long] |
| Dire Straits - Sultans Of Swing (Alchemy Live) | 4.16 s | 2.00 s | 2.06 s | 2.06 s | 3.95 s | 4.12 s | 2.74 s | 0.01 ms | OK [long] |
| Pink Floyd - Echoes (Live at Pompeii) | — | — | — | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms | Error: yt-dlp failed: ERROR: [youtube] bM7SZ5SBzyY: Private video. Sign in if you've been granted access to this video. Use --cookies-from-browser or --cookies for the authentication. See  https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp  for how to manually pass cookies. Also see  https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies  for tips on effectively exporting YouTube cookies
 |
| Lofi Girl / Chillhop - Lofi Hip Hop Chill Beats - Study Mix | 3.10 s | 2.21 s | 2.22 s | 2.22 s | 3.01 s | 3.08 s | 2.51 s | 0.01 ms | OK [mix] |

**Resumen Global Integrado**:
- Cold Cache -> Media: **2.36 s** | p50: **2.21 s** | p95: **3.84 s** | p99: **4.45 s** | StdDev: 620.87 ms
- Warm Cache -> Media: **0.02 ms** | p50: **0.00 ms** | p95: **0.05 ms** | p99: **0.06 ms**

## 3. Comparativa Delta (Modelo API vs Modelo Integrado)

| Track | Categoría | API Media (Cold) | Integrado Media (Cold) | Delta (ms) | Delta (%) |
|-------|-----------|------------------|------------------------|------------|-----------|
| Queen - We Will Rock You | short | 2.05 s | 2.08 s | +27.70 ms | +1.35% |
| Rick Astley - Never Gonna Give You Up | standard | 2.51 s | 2.12 s | -388.01 ms | -15.48% |
| Radiohead - Creep | standard | 2.21 s | 2.19 s | -20.38 ms | -0.92% |
| PSY - Gangnam Style | standard | 2.82 s | 2.24 s | -577.84 ms | -20.52% |
| Luis Fonsi - Despacito ft. Daddy Yankee | standard | 2.15 s | 2.05 s | -92.54 ms | -4.31% |
| Queen - Bohemian Rhapsody | standard | 2.51 s | 2.31 s | -196.22 ms | -7.83% |
| Led Zeppelin - Stairway to Heaven | long | 2.12 s | 3.03 s | +909.24 ms | +42.97% |
| Dire Straits - Sultans Of Swing (Alchemy Live) | long | 2.05 s | 2.74 s | +691.29 ms | +33.73% |
| Pink Floyd - Echoes (Live at Pompeii) | long | 0.00 ms | 0.00 ms | 0.00 ms | 0.00% |
| Lofi Girl / Chillhop - Lofi Hip Hop Chill Beats - Study Mix | mix | 2.05 s | 2.51 s | +465.10 ms | +22.73% |
