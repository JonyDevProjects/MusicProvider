import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import '../models/track.dart';
import '../services/api_service.dart';
import '../native/ytdlp_service.dart';

class PlayerProvider with ChangeNotifier {
  final AudioPlayer _audioPlayer = AudioPlayer();
  final ApiService _apiService = ApiService();
  final YtDlpService _ytDlpService = YtDlpService.instance;

  Track? _currentTrack;
  bool _isLoading = false;
  bool _useNative = true; // Flag to use native Rust library
  bool _nativeAvailable = false; // Track if native library is available

  Track? get currentTrack => _currentTrack;
  bool get isLoading => _isLoading;
  AudioPlayer get audioPlayer => _audioPlayer;
  bool get useNative => _useNative;
  bool get nativeAvailable => _nativeAvailable;

  PlayerProvider() {
    _initNative();
  }

  /// Initialize native library and check availability
  Future<void> _initNative() async {
    try {
      await _ytDlpService.initialize();
      await _ytDlpService.getVersion();
      _nativeAvailable = true;
    } catch (e) {
      _nativeAvailable = false;
      _useNative = false;
      if (kDebugMode) {
        print('Native library not available: $e');
      }
    }
    notifyListeners();
  }

  Future<void> playTrack(Track track) async {
    _isLoading = true;
    _currentTrack = track;
    notifyListeners();

    try {
      String streamUrl;
      
      if (_useNative && _nativeAvailable) {
        // Use native Rust library
        final streamInfo = await _ytDlpService.getStreamInfo(track.id);
        streamUrl = streamInfo.streamUrl;
      } else {
        // Use legacy API service
        streamUrl = await _apiService.getStreamUrl(track.id);
      }
      
      await _audioPlayer.setUrl(streamUrl);
      _audioPlayer.play();
    } catch (e) {
      if (kDebugMode) {
        print('Error playing track: $e');
      }
      // Fallback to legacy API if native fails
      if (_useNative && _nativeAvailable) {
        try {
          final streamUrl = await _apiService.getStreamUrl(track.id);
          await _audioPlayer.setUrl(streamUrl);
          _audioPlayer.play();
        } catch (fallbackError) {
          if (kDebugMode) {
            print('Fallback also failed: $fallbackError');
          }
        }
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
