import 'package:flutter/foundation.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import '../models/track.dart';
import 'music_service.dart';

class YtExplodeService implements MusicService {
  final YoutubeExplode _yt = YoutubeExplode();

  // Static log buffer for integration testing — captures key lifecycle events
  static final List<String> logBuffer = [];
  static void log(String message) {
    final ts = DateTime.now().toIso8601String();
    logBuffer.add('[$ts] $message');
    debugPrint('[YtExplodeService] $message');
  }
  static void clearLog() => logBuffer.clear();

  @override
  Future<List<Track>> searchTracks(String query) async {
    final searchList = await _yt.search.search(query);
    return searchList.take(10).map((video) => Track(
      id: video.id.value,
      title: video.title,
      artist: video.author,
      thumbnail: video.thumbnails.highResUrl,
      duration: video.duration?.inSeconds,
    )).toList();
  }

  @override
  Future<StreamResult> getStream(String videoId) async {
    try {
      log('getStream called for: $videoId');

      final video = await _yt.videos.get(VideoId(videoId));
      final manifest = await _yt.videos.streamsClient.getManifest(VideoId(videoId));

      final audioOnly = manifest.audioOnly.sortByBitrate();

      // Select the highest bitrate AAC/MP4 stream (iOS compatible)
      AudioStreamInfo? selected;
      for (final s in audioOnly) {
        final codec = s.audioCodec.toLowerCase();
        if (codec.contains('mp4a') || codec.contains('aac')) {
          selected = s;
          break;
        }
      }
      selected ??= audioOnly.first;

      log('Selected: ${selected.bitrate} codec=${selected.audioCodec}');

      // D4: Return CDN URL directly to AVAudioPlayer (via audioplayers).
      // audioplayers does not support custom headers on UrlSource,
      // so we pass headers: null. This tests whether AVAudioPlayer
      // can connect to YouTube CDN without special headers.
      final cdnUrl = selected.url.toString();
      log('Returning CDN URL directly');

      return StreamResult(
        url: cdnUrl,
        headers: null,
        durationSeconds: video.duration?.inSeconds,
      );
    } catch (e, st) {
      log('getStream FAILED: $e');
      log('Stack trace: $st');
      rethrow;
    }
  }

  void close() {
    _yt.close();
  }
}
