import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import '../models/track.dart';
import '../services/api_service.dart';

class PlayerProvider with ChangeNotifier {
  final AudioPlayer _audioPlayer = AudioPlayer();
  final ApiService _apiService = ApiService();

  Track? _currentTrack;
  bool _isLoading = false;

  Track? get currentTrack => _currentTrack;
  bool get isLoading => _isLoading;
  AudioPlayer get audioPlayer => _audioPlayer;

  Future<void> playTrack(Track track) async {
    _isLoading = true;
    _currentTrack = track;
    notifyListeners();

    try {
      final streamUrl = await _apiService.getStreamUrl(track.id);
      await _audioPlayer.setUrl(streamUrl);
      _audioPlayer.play();
    } catch (e) {
      if (kDebugMode) {
        print('Error playing track: $e');
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
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
