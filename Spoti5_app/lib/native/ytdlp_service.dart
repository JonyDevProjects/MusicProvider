import 'dart:async';
import 'package:flutter_rust_bridge/flutter_rust_bridge.dart';
import 'ytdlp_native.dart';

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

/// Search result from yt-dlp
class SearchResult {
  final String id;
  final String title;
  final double? duration;
  final String? thumbnail;
  final String? channel;

  SearchResult({
    required this.id,
    required this.title,
    this.duration,
    this.thumbnail,
    this.channel,
  });

  factory SearchResult.fromNative(dynamic native) {
    return SearchResult(
      id: native.id,
      title: native.title,
      duration: native.duration,
      thumbnail: native.thumbnail,
      channel: native.channel,
    );
  }

  @override
  String toString() => 'SearchResult(id: $id, title: $title)';
}

/// Stream information from yt-dlp
class StreamInfo {
  final String streamUrl;
  final double? duration;
  final String? title;
  final String? container;
  final String? codec;

  StreamInfo({
    required this.streamUrl,
    this.duration,
    this.title,
    this.container,
    this.codec,
  });

  factory StreamInfo.fromNative(dynamic native) {
    return StreamInfo(
      streamUrl: native.streamUrl,
      duration: native.duration,
      title: native.title,
      container: native.container,
      codec: native.codec,
    );
  }

  @override
  String toString() => 'StreamInfo(title: $title, url: $streamUrl)';
}

/// Playlist information from yt-dlp
class PlaylistInfo {
  final String id;
  final String title;
  final List<PlaylistEntry> entries;

  PlaylistInfo({
    required this.id,
    required this.title,
    required this.entries,
  });

  factory PlaylistInfo.fromNative(dynamic native) {
    return PlaylistInfo(
      id: native.id,
      title: native.title,
      entries: native.entries.map((e) => PlaylistEntry.fromNative(e)).toList(),
    );
  }

  @override
  String toString() => 'PlaylistInfo(title: $title, entries: ${entries.length})';
}

/// Playlist entry from yt-dlp
class PlaylistEntry {
  final String id;
  final String title;
  final double? duration;
  final List<Thumbnail> thumbnails;
  final String? channel;

  PlaylistEntry({
    required this.id,
    required this.title,
    this.duration,
    required this.thumbnails,
    this.channel,
  });

  factory PlaylistEntry.fromNative(dynamic native) {
    return PlaylistEntry(
      id: native.id,
      title: native.title,
      duration: native.duration,
      thumbnails: native.thumbnails.map((t) => Thumbnail.fromNative(t)).toList(),
      channel: native.channel,
    );
  }

  @override
  String toString() => 'PlaylistEntry(id: $id, title: $title)';
}

/// Thumbnail information
class Thumbnail {
  final String url;
  final int? width;
  final int? height;

  Thumbnail({
    required this.url,
    this.width,
    this.height,
  });

  factory Thumbnail.fromNative(dynamic native) {
    return Thumbnail(
      url: native.url,
      width: native.width,
      height: native.height,
    );
  }

  @override
  String toString() => 'Thumbnail(url: $url)';
}