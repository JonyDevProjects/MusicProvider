import 'package:audioplayers/audioplayers.dart';
import 'base_audio_adapter.dart';

class AudioPlayersAdapter implements BaseAudioAdapter {
  final AudioPlayer _player = AudioPlayer();

  @override
  Stream<Duration> get onPositionChanged => _player.onPositionChanged;

  @override
  Stream<Duration> get onDurationChanged => _player.onDurationChanged;

  @override
  Stream<AdapterPlayerState> get onPlayerStateChanged =>
      _player.onPlayerStateChanged.map(_mapState);

  @override
  AdapterPlayerState get state => _mapState(_player.state);

  AdapterPlayerState _mapState(PlayerState state) {
    switch (state) {
      case PlayerState.playing:
        return AdapterPlayerState.playing;
      case PlayerState.paused:
        return AdapterPlayerState.paused;
      case PlayerState.completed:
        return AdapterPlayerState.completed;
      case PlayerState.stopped:
      case PlayerState.disposed:
        return AdapterPlayerState.stopped;
    }
  }

  @override
  Future<void> playUrl(String url, {Map<String, String>? headers}) async {
    // audioplayers does not easily support headers in UrlSource without extra setup,
    // but for the proxy backend it doesn't need them.
    await _player.play(UrlSource(url));
  }

  @override
  Future<void> playFile(String path) async {
    await _player.play(DeviceFileSource(path));
  }

  @override
  Future<void> pause() async {
    await _player.pause();
  }

  @override
  Future<void> resume() async {
    await _player.resume();
  }

  @override
  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  @override
  Future<void> dispose() async {
    await _player.dispose();
  }
}
