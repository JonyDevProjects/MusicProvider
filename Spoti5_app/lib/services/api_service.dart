import 'dart:convert';
import 'dart:io' if (dart.library.html) 'stub_io.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:async';
import '../models/track.dart';
import 'music_service.dart';

class ApiService implements MusicService {
  // En emulador de Android usa 10.0.2.2. En iOS, Web o Desktop usa localhost.
  // En dispositivos físicos se pasa la IP LAN de la Mac vía --dart-define=BASE_URL=...
  static String get baseUrl {
    const fromDefine = String.fromEnvironment('BASE_URL');
    if (fromDefine.isNotEmpty) return fromDefine;
    if (Platform.isAndroid) return 'http://10.0.2.2:3000/api';
    return 'http://localhost:3000/api';
  }

  // Persistent HTTP client with connection pooling / keep-alive.
  // Reuses TCP+TLS connections to the tunnel server for successive requests,
  // avoiding renegotiation overhead on each metadata call.
  static final http.Client _client = http.Client();

  @visibleForTesting
  static http.Client? mockClient;
  
  static http.Client get effectiveClient => mockClient ?? _client;

  @override
  Future<List<Track>> searchTracks(String query) async {
    final response = await effectiveClient.get(Uri.parse('$baseUrl/search?q=$query'));
    
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Track.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load search results');
    }
  }

  Future<String> getStreamUrl(String videoId) async {
    // Devolvemos la URL del nuevo endpoint de proxy de streaming
    return '$baseUrl/audio/stream?videoId=$videoId';
  }

  @override
  Future<StreamResult> getStream(String videoId) async {
    // Pre-resolve: warm the backend yt-dlp cache so AVPlayer's probe request
    // hits cache immediately instead of triggering yt-dlp (~3-5s) inline.
    try {
      final response = await effectiveClient.get(Uri.parse('$baseUrl/audio/resolve?videoId=$videoId'));
      if (response.statusCode == 200) {
        debugPrint('[ApiService] Stream pre-resolved and cached for $videoId');
      } else {
        debugPrint('[ApiService] Pre-resolve returned ${response.statusCode}, proceeding with stream');
      }
    } catch (e) {
      debugPrint('[ApiService] Pre-resolve failed (non-critical): $e');
    }

    final url = await getStreamUrl(videoId);
    return StreamResult(url: url);
  }

  @override
  Future<void> warmupCache(List<String> videoIds) async {
    // Fire-and-forget: dispatch async GET requests to /api/audio/resolve for
    // each video ID so the backend yt-dlp cache is pre-populated while the
    // user reads search results. Failures are logged but never block the caller.
    for (final videoId in videoIds) {
      unawaited(_resolveAndCache(videoId));
    }
  }

  Future<void> _resolveAndCache(String videoId) async {
    try {
      final response = await effectiveClient.get(Uri.parse('$baseUrl/audio/resolve?videoId=$videoId'));
      if (response.statusCode == 200) {
        debugPrint('[ApiService] Warmup cached stream for $videoId');
      } else {
        debugPrint('[ApiService] Warmup resolve returned ${response.statusCode} for $videoId');
      }
    } catch (e) {
      debugPrint('[ApiService] Warmup resolve failed for $videoId (non-critical): $e');
    }
  }
}
