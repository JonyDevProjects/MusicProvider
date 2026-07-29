import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import '../models/track.dart';
import 'music_service.dart';

class YtExplodeService implements MusicService {
  final YoutubeExplode _yt = YoutubeExplode();

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

      if (kDebugMode) {
        print('[YtExplodeService] Selected: ${selected.bitrate} codec=${selected.audioCodec}');
      }

      // Download stream to local file using Dart HTTP client (bypasses AVPlayer networking issues)
      final uri = selected.url;
      final request = http.Request('GET', uri)
        ..headers['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
      final response = await http.Client().send(request);

      if (response.statusCode != 200) {
        throw Exception('Failed to download stream: ${response.statusCode}');
      }

      // Save to temporary file
      final tempDir = Directory.systemTemp;
      final tempFile = File('${tempDir.path}/yt_stream_$videoId.mp4');
      final sink = tempFile.openWrite();
      await response.stream.pipe(sink);
      await sink.close();

      if (kDebugMode) {
        print('[YtExplodeService] Downloaded stream to: ${tempFile.path} (${tempFile.lengthSync()} bytes)');
      }

      return StreamResult(
        url: tempFile.uri.toString(),
        headers: null,
        durationSeconds: video.duration?.inSeconds,
      );
    } catch (e, st) {
      print('[YtExplodeService] getStream FAILED: $e');
      print('[YtExplodeService] Stack trace: $st');
      rethrow;
    }
  }

  void close() {
    _yt.close();
  }
}
