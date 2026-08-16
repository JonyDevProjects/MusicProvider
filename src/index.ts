import type {
  NuclearPlugin,
  NuclearPluginAPI,
  StreamingProvider,
  StreamCandidate,
  Stream,
  YtdlpStreamInfo as SDKStreamInfo,
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

  return {
    url,
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
      getStreamUrl: async (candidateId: string) => {
        const info = await resolveStreamInfo(candidateId, async (id) => {
          const sdkInfo = await api.Ytdlp.getStream(id);
          return sdkToInternal(sdkInfo);
        });
        return toStream(info.streamUrl, info, candidateId);
      },
    };

    api.Providers.register(streamingProvider);
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
