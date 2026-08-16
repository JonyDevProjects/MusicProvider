import type {
  NuclearPlugin,
  NuclearPluginAPI,
  StreamingProvider,
  StreamCandidate,
  Stream,
  YtdlpStreamInfo as SDKStreamInfo,
  Track,
  PlaylistProvider,
  Playlist
} from '@nuclearplayer/plugin-sdk';
import type { YtdlpStreamInfo } from './ytdlpWrapper.js';
import { resolveStreamInfo } from './streamCache.js';

const PROVIDER_ID = 'music-provider';
const PROVIDER_NAME = 'MusicProvider';

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
    source: { provider: PROVIDER_ID, id },
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
    source: { provider: PROVIDER_ID, id: sourceId },
  };
}

const plugin: NuclearPlugin = {
  onLoad: async (api: NuclearPluginAPI) => {
    const streamingProvider: StreamingProvider = {
      id: PROVIDER_ID,
      kind: 'streaming',
      name: PROVIDER_NAME,
      searchForTrack: async (artist: string, title: string, album?: string) => {
        const query = album
          ? `${artist} - ${title} - ${album}`
          : `${artist} - ${title}`;
        const results = await api.Ytdlp.search(query, 10);
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
          
        const results = await api.Ytdlp.search(query, 10);
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
      id: PROVIDER_ID,
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
                source: { provider: PROVIDER_ID, id: entry.id },
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

    api.Providers.register(streamingProvider);
    api.Providers.register(playlistProvider);
  },
  onEnable: async (_api: NuclearPluginAPI) => {
    console.log(`[${PROVIDER_NAME}] Plugin enabled`);
  },
  onDisable: async (_api: NuclearPluginAPI) => {
    console.log(`[${PROVIDER_NAME}] Plugin disabled`);
  },
  onUnload: async (api: NuclearPluginAPI) => {
    api.Providers.unregister(PROVIDER_ID);
  },
};

export default plugin;
