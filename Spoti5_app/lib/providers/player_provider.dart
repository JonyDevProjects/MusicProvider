import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import '../models/track.dart';
import '../services/music_service.dart';
import '../services/music_service_factory.dart';

class PlayerProvider with ChangeNotifier {
  final AudioPlayer _audioPlayer = AudioPlayer();
  final List<MusicService> _services;

  Track? _currentTrack;
  bool _isLoading = false;

  PlayerProvider({List<MusicService>? services})
      : _services = services ?? MusicServiceFactory.create();

  Track? get currentTrack => _currentTrack;
  bool get isLoading => _isLoading;
  AudioPlayer get audioPlayer => _audioPlayer;
  MusicService get service => _services.first;

  Future<void> playTrack(Track track) async {
    _isLoading = true;
    _currentTrack = track;
    notifyListeners();

    try {
      for (var i = 0; i < _services.length; i++) {
        try {
          if (kDebugMode) {
            print('[PlayerProvider] Trying service ${_services[i].runtimeType} for track ${track.id}');
          }
          final result = await _services[i].getStream(track.id);
          if (kDebugMode) {
            print('[PlayerProvider] Got stream URL: ${result.url.substring(0, result.url.length.clamp(0, 120))}...');
            print('[PlayerProvider] Headers: ${result.headers}');
          }

          final uri = Uri.parse(result.url);
          if (uri.scheme == 'file') {
            await _audioPlayer.setAudioSource(
              AudioSource.file(
                uri.toFilePath(),
              ),
            );
          } else {
            await _audioPlayer.setAudioSource(
              AudioSource.uri(
                uri,
                headers: result.headers,
              ),
            );
          }
          _audioPlayer.play();
          break;
        } catch (e, st) {
          print('[PlayerProvider] Service ${_services[i].runtimeType} FAILED: $e');
          print('[PlayerProvider] Stack trace: $st');
          if (i == _services.length - 1) rethrow;
        }
      }
    } catch (e) {
      print('[PlayerProvider] All services failed to play track: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<Track>> searchTracks(String query) async {
    for (var i = 0; i < _services.length; i++) {
      try {
        return await _services[i].searchTracks(query);
      } catch (e) {
        if (kDebugMode) {
          print('[PlayerProvider] Service ${_services[i].runtimeType} search failed: $e');
        }
        if (i == _services.length - 1) rethrow;
      }
    }
    return [];
  }

  void togglePlayPause() {
    if (_audioPlayer.playing) {
      _audioPlayer.pause();
    } else {
      _audioPlayer.play();
    }
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }
}
