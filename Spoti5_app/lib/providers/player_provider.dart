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
          final result = await _services[i].getStream(track.id);
          await _audioPlayer.setAudioSource(
            AudioSource.uri(
              Uri.parse(result.url),
              headers: result.headers,
            ),
          );
          _audioPlayer.play();
          break;
        } catch (e) {
          if (kDebugMode) {
            print('Service ${_services[i].runtimeType} failed: $e');
          }
          if (i == _services.length - 1) rethrow;
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('All services failed to play track: $e');
      }
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
          print('Service ${_services[i].runtimeType} search failed: $e');
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
