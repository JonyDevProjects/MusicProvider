import 'dart:async';
import 'ytdlp_native.dart';
import 'lib.dart';

/// Service for interacting with yt-dlp via Rust native library
class YtDlpService {
  static YtDlpService? _instance;
  late final YtDlpNative _native;
  bool _initialized = false;

  YtDlpService._();

  /// Get singleton instance
  static YtDlpService get instance {
    _instance ??= YtDlpService._();
    return _instance!;
  }

  /// Initialize the service and ensure yt-dlp is installed
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      _native = YtDlpNative();
      await _native.ensureInstalled();
      _initialized = true;
    } catch (e) {
      throw Exception('Failed to initialize yt-dlp: $e');
    }
  }

  /// Search for tracks
  ///
  /// [query] - Search query string
  /// [limit] - Maximum number of results (default: 10)
  Future<List<SearchResult>> search(String query, {int limit = 10}) async {
    _ensureInitialized();
    try {
      final results = await _native.search(query: query, limit: limit);
      return results;
    } catch (e) {
      throw Exception('Search failed: $e');
    }
  }

  /// Get stream information for a video
  ///
  /// [videoId] - YouTube video ID or URL
  Future<StreamInfo> getStreamInfo(String videoId) async {
    _ensureInitialized();
    try {
      final info = await _native.getStreamInfo(videoId: videoId);
      return info;
    } catch (e) {
      throw Exception('Failed to get stream info: $e');
    }
  }

  /// Get playlist information
  ///
  /// [url] - Playlist URL
  Future<PlaylistInfo> getPlaylist(String url) async {
    _ensureInitialized();
    try {
      final playlist = await _native.getPlaylist(url: url);
      return playlist;
    } catch (e) {
      throw Exception('Failed to get playlist: $e');
    }
  }

  /// Get yt-dlp version
  Future<String> getVersion() async {
    _ensureInitialized();
    try {
      final version = await _native.getVersion();
      return version;
    } catch (e) {
      throw Exception('Failed to get version: $e');
    }
  }

  void _ensureInitialized() {
    if (!_initialized) {
      throw Exception('YtDlpService not initialized. Call initialize() first.');
    }
  }
}
