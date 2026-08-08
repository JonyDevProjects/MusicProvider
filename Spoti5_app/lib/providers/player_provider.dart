import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import '../models/track.dart';
import '../services/music_service.dart';
import '../services/music_service_factory.dart';
import 'audio/base_audio_adapter.dart';
import 'audio/audioplayers_adapter.dart';
import 'audio/just_audio_adapter.dart';

class PlayerProvider with ChangeNotifier {
  late final BaseAudioAdapter _audioPlayer;
  final List<MusicService> _services;

  Track? _currentTrack;
  bool _isLoading = false;
  String? _error;
  bool _disposed = false;
  String? _currentPlaybackUrl;
  Duration _pausedPosition = Duration.zero;

  // Tracked via streams for UI compatibility
  Duration _position = Duration.zero;
  Duration? _duration;

  PlayerProvider({List<MusicService>? services})
      : _services = services ?? MusicServiceFactory.create() {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      _audioPlayer = JustAudioAdapter();
    } else {
      _audioPlayer = AudioPlayersAdapter();
    }
    _audioPlayer.onPositionChanged.listen((pos) {
      _position = pos;
    });
    _audioPlayer.onDurationChanged.listen((dur) {
      _duration = dur;
    });
    _audioPlayer.onPlayerStateChanged.listen((state) {
      if (!_disposed) {
        notifyListeners();
      }
    });
  }

  Track? get currentTrack => _currentTrack;
  bool get isLoading => _isLoading;
  String? get error => _error;
  MusicService get service => _services.first;

  // Wrapper getters for UI / integration tests
  bool get playing => _audioPlayer.state == AdapterPlayerState.playing;
  Duration get position => _position;
  Duration? get duration => _duration;
  Stream<bool> get playingStream =>
      _audioPlayer.onPlayerStateChanged.map((s) => s == AdapterPlayerState.playing);
  Stream<Duration> get positionStream => _audioPlayer.onPositionChanged;

  Future<void> playTrack(Track track) async {
    _isLoading = true;
    _error = null;
    _currentTrack = track;
    notifyListeners();

    try {
      for (var i = 0; i < _services.length; i++) {
        try {
          debugPrint('[PlayerProvider] Trying service ${_services[i].runtimeType} for track ${track.id}');
          final result = await _services[i].getStream(track.id);
          debugPrint('[PlayerProvider] Got stream URL: ${result.url.substring(0, result.url.length.clamp(0, 120))}...');
          debugPrint('[PlayerProvider] Headers: ${result.headers}');

          final uri = Uri.parse(result.url);
          if (uri.scheme == 'file') {
            debugPrint('[PlayerProvider] Playing from file: ${uri.toFilePath()}');
            await _audioPlayer.playFile(uri.toFilePath());
          } else {
            debugPrint('[PlayerProvider] Playing from URL: $uri');
            _currentPlaybackUrl = result.url;
            await _audioPlayer.playUrl(result.url, headers: result.headers);
          }
          debugPrint('[PlayerProvider] Playback started');
          break;
        } catch (e, st) {
          debugPrint('[PlayerProvider] Service ${_services[i].runtimeType} FAILED: $e');
          debugPrint('[PlayerProvider] Stack trace: $st');
          if (e.toString().contains('Rate limited')) {
            _error = 'YouTube rate limit reached. Please wait a few minutes.';
          }
          if (e.toString().contains('Download stalled') || e.toString().contains('503')) {
            _error = 'YouTube download stalled. Please try again in a minute.';
          }
          if (i == _services.length - 1) rethrow;
        }
      }
    } catch (e) {
      debugPrint('[PlayerProvider] All services failed to play track: $e');
      _error ??= 'Failed to play track. Please try again.';
    } finally {
      _isLoading = false;
      if (!_disposed) notifyListeners();
    }
  }

  Future<List<Track>> searchTracks(String query) async {
    for (var i = 0; i < _services.length; i++) {
      try {
        debugPrint('[PlayerProvider] Searching with ${_services[i].runtimeType}');
        final results = await _services[i].searchTracks(query);

        // Warmup: dispatch async resolve requests for the top 3 tracks so the
        // backend cache (yt-dlp stream URLs) is pre-populated while the user
        // reads the search results. Fire-and-forget — does not block or await.
        final warmupIds = results.take(3).map((t) => t.id).toList();
        _services[i].warmupCache(warmupIds);

        return results;
      } catch (e) {
        debugPrint('[PlayerProvider] Service ${_services[i].runtimeType} search failed: $e');
        if (i == _services.length - 1) rethrow;
      }
    }
    return [];
  }

  void togglePlayPause() {
    if (_audioPlayer.state == AdapterPlayerState.playing) {
      _pausedPosition = _position;
      _audioPlayer.pause();
    } else if (_currentPlaybackUrl != null) {
      _pausedPosition = Duration.zero;
      _audioPlayer.resume();
    }
  }

  void seek(Duration position) {
    _audioPlayer.seek(position);
  }

  @override
  void dispose() {
    _disposed = true;
    _audioPlayer.dispose();
    super.dispose();
  }
}
