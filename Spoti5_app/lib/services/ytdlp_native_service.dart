import '../models/track.dart';
import '../native/ytdlp_service.dart';
import 'music_service.dart';

class YtdlpNativeService implements MusicService {
  final YtDlpService _ytDlpService = YtDlpService.instance;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    await _ytDlpService.initialize();
    _initialized = true;
  }

  @override
  Future<List<Track>> searchTracks(String query) async {
    await initialize();
    final results = await _ytDlpService.search(query);
    return results.map((sr) => Track(
      id: sr.id,
      title: sr.title,
      artist: sr.channel,
      thumbnail: sr.thumbnail,
      duration: sr.duration?.toInt(),
    )).toList();
  }

  @override
  Future<StreamResult> getStream(String videoId) async {
    await initialize();
    final info = await _ytDlpService.getStreamInfo(videoId);
    return StreamResult(
      url: info.streamUrl,
      durationSeconds: info.duration?.toInt(),
    );
  }

  @override
  Future<void> warmupCache(List<String> videoIds) async {
    // Native yt-dlp service resolves streams directly — no remote cache to warm.
  }
}
