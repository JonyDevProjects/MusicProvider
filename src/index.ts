import type {
  NuclearPlugin,
  NuclearPluginAPI,
  StreamingProvider,
  StreamCandidate,
  Stream,
  YtdlpStreamInfo as SDKStreamInfo,
  Track,
  PlaylistProvider,
  Playlist,
  MetadataProvider
} from '@nuclearplayer/plugin-sdk';
import type { YtdlpStreamInfo } from './ytdlpWrapper.js';
import { resolveStreamInfo } from './streamCache.js';

const PROVIDER_ID = 'music-provider';
const PROVIDER_NAME = 'MusicProvider';

const STREAMING_ID = `${PROVIDER_ID}-streaming`;
const PLAYLIST_ID = `${PROVIDER_ID}-playlist`;
const METADATA_ID = `${PROVIDER_ID}-metadata`;

function sdkToInternal(info: SDKStreamInfo): YtdlpStreamInfo {
  return {
    streamUrl: info.stream_url,
    duration: info.duration,
    title: info.title,
    container: info.container,
    codec: info.codec,
  };
}

function toStreamCandidate(
  id: string,
  title: string,
  duration: number | null,
  thumbnail: string | null,
): StreamCandidate {
  return {
    id,
    title,
    durationMs: duration ? Math.round(duration * 1000) : undefined,
    thumbnail: thumbnail ?? undefined,
    failed: false,
    source: { provider: STREAMING_ID, id },
  };
}

function toStream(url: string, info: YtdlpStreamInfo, sourceId: string): Stream {
  const ext = info.container || '';
  const mimeType = ext.includes('m4a') || ext.includes('mp4')
    ? 'audio/mp4'
    : ext.includes('webm')
      ? 'audio/webm'
      : ext.includes('opus')
        ? 'audio/ogg'
        : undefined;

  // Append a range parameter to force the YouTube CDN to return an HTTP 206 Partial Content response.
  // This circumvents issues where internal players (like Web Audio API) fetch without Range headers,
  // which YouTube rejects with HTTP 403 for long streams, causing infinite loading loops.
  const chunkedUrl = url.includes('&range=') ? url : `${url}&range=0-99999999999`;

  return {
    url: chunkedUrl,
    protocol: 'https',
    mimeType,
    codec: info.codec || undefined,
    container: info.container || undefined,
    durationMs: info.duration ? Math.round(info.duration * 1000) : undefined,
    source: { provider: STREAMING_ID, id: sourceId },
  };
}

function parseDuration(text: string): number {
  if (!text) return 0;
  const parts = text.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

async function scrapeYoutube(api: NuclearPluginAPI, query: string, limit: number) {
  try {
    console.log(`[${PROVIDER_NAME}] Starting YouTube scrape for: "${query}"`);
    const res = await api.Http.fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    
    if (res.status !== 200) {
      console.warn(`[${PROVIDER_NAME}] YouTube returned status ${res.status}`);
    }

    const match = res.body.match(/var ytInitialData = (\{.+?\});<\/script>/);
    if (!match) {
      console.warn(`[${PROVIDER_NAME}] No ytInitialData found in HTML`);
      return [];
    }
    
    const json = JSON.parse(match[1]);
    const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents) {
      console.warn(`[${PROVIDER_NAME}] Invalid ytInitialData structure`);
      return [];
    }
    
    let videos: any[] = [];
    for (const section of contents) {
      if (section.itemSectionRenderer?.contents) {
        const found = section.itemSectionRenderer.contents
          .filter((c: any) => c.videoRenderer)
          .map((c: any) => c.videoRenderer);
        videos = videos.concat(found);
      }
    }
    
    console.log(`[${PROVIDER_NAME}] Scrape found ${videos.length} videos, limiting to ${limit}`);
    
    return videos.slice(0, limit).map(v => {
      const thumbs = v.thumbnail?.thumbnails || [];
      const thumbnail = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : null;
      const durationStr = v.lengthText?.simpleText || '';
      return {
        id: v.videoId,
        title: v.title?.runs?.[0]?.text || 'Unknown',
        duration: parseDuration(durationStr),
        thumbnail,
        channel: v.ownerText?.runs?.[0]?.text || 'Unknown'
      };
    });
  } catch (error) {
    console.error(`[${PROVIDER_NAME}] YouTube scrape failed:`, error);
    // Fallback to Nuclear's Ytdlp which will fail if yt-dlp isn't installed
    return await api.Ytdlp.search(query, limit);
  }
}

const plugin: NuclearPlugin = {
  onLoad: async (api: NuclearPluginAPI) => {
    const streamingProvider: StreamingProvider = {
      id: STREAMING_ID,
      kind: 'streaming',
      name: PROVIDER_NAME,
      searchForTrack: async (artist: string, title: string, album?: string) => {
        const query = album
          ? `${artist} - ${title} - ${album}`
          : `${artist} - ${title}`;
        
        const results = await scrapeYoutube(api, query, 10);
        return results.map(r =>
          toStreamCandidate(r.id, r.title, r.duration, r.thumbnail),
        );
      },
      searchForTrackV2: async (track: Track) => {
        const artist = track.artists?.[0]?.name || '';
        const title = track.title;
        const album = track.album?.title;
        
        const query = album
          ? `${artist} - ${title} - ${album}`
          : `${artist} - ${title}`;
          
        const results = await scrapeYoutube(api, query, 10);
        return results.map(r =>
          toStreamCandidate(r.id, r.title, r.duration, r.thumbnail),
        );
      },
      getStreamUrl: async (candidateId: string) => {
        const info = await resolveStreamInfo(candidateId, async (id) => {
          const sdkInfo = await api.Ytdlp.getStream(id);
          return sdkToInternal(sdkInfo);
        });
        return toStream(info.streamUrl, info, candidateId);
      },
    };

    const playlistProvider: PlaylistProvider = {
      id: PLAYLIST_ID,
      kind: 'playlists',
      name: PROVIDER_NAME,
      matchesUrl: (url: string) => {
        return url.includes('youtube.com/') || url.includes('youtu.be/') || url.startsWith('ytsearch');
      },
      fetchPlaylistByUrl: async (url: string) => {
        const ytdlpPlaylist = await api.Ytdlp.getPlaylist(url);
        const now = new Date().toISOString();
        
        const playlist: Playlist = {
          id: ytdlpPlaylist.id || btoa(encodeURIComponent(url)),
          name: ytdlpPlaylist.title || 'Unknown Playlist',
          isReadOnly: true,
          createdAtIso: now,
          lastModifiedIso: now,
          items: ytdlpPlaylist.entries.map((entry) => {
            return {
              id: entry.id,
              addedAtIso: now,
              track: {
                title: entry.title,
                artists: entry.channel ? [{ name: entry.channel, roles: [] }] : [],
                durationMs: entry.duration ? Math.round(entry.duration * 1000) : undefined,
                source: { provider: STREAMING_ID, id: entry.id },
                artwork: entry.thumbnails?.length ? {
                  items: entry.thumbnails.map(t => ({
                    url: t.url,
                    width: t.width ?? undefined,
                    height: t.height ?? undefined,
                    purpose: 'thumbnail'
                  }))
                } : undefined
              }
            };
          })
        };
        return playlist;
      }
    };

    const metadataProvider: MetadataProvider = {
      id: METADATA_ID,
      kind: 'metadata',
      name: PROVIDER_NAME,
      searchCapabilities: ['tracks', 'unified'],
      streamingProviderId: STREAMING_ID,
      search: async (params) => {
        const query = params.query;
        if (!query) return {};

        const results = await scrapeYoutube(api, query, 20);
        return {
          tracks: results.map((r) => ({
            title: r.title,
            artists: r.channel ? [{ name: r.channel, roles: [] }] : [],
            durationMs: r.duration ? Math.round(r.duration * 1000) : undefined,
            artwork: r.thumbnail
              ? { items: [{ url: r.thumbnail, purpose: 'thumbnail' }] }
              : undefined,
            source: { provider: STREAMING_ID, id: r.id },
          })),
        };
      },
    };

    api.Providers.register(streamingProvider);
    api.Providers.register(playlistProvider);
    api.Providers.register(metadataProvider);
  },
  onEnable: async (_api: NuclearPluginAPI) => {
    console.log(`[${PROVIDER_NAME}] Plugin enabled`);
  },
  onDisable: async (_api: NuclearPluginAPI) => {
    console.log(`[${PROVIDER_NAME}] Plugin disabled`);
  },
  onUnload: async (api: NuclearPluginAPI) => {
    api.Providers.unregister(STREAMING_ID);
    api.Providers.unregister(PLAYLIST_ID);
    api.Providers.unregister(METADATA_ID);
  },
};

export default plugin;
