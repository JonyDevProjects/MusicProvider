import 'package:just_audio/just_audio.dart';
import 'base_audio_adapter.dart';

class JustAudioAdapter implements BaseAudioAdapter {
  final AudioPlayer _player = AudioPlayer();

  @override
  Stream<Duration> get onPositionChanged => _player.positionStream;

  @override
  Stream<Duration> get onDurationChanged =>
      _player.durationStream.map((d) => d ?? Duration.zero);

  @override
  Stream<AdapterPlayerState> get onPlayerStateChanged =>
      _player.playerStateStream.map(_mapState);

  @override
  AdapterPlayerState get state => _mapState(_player.playerState);

  AdapterPlayerState _mapState(PlayerState state) {
    if (state.processingState == ProcessingState.completed) {
      return AdapterPlayerState.completed;
    }
    if (state.playing) {
      return AdapterPlayerState.playing;
    } else {
      if (state.processingState == ProcessingState.idle) {
        return AdapterPlayerState.stopped;
      }
      return AdapterPlayerState.paused;
    }
  }

  @override
  Future<void> playUrl(String url, {Map<String, String>? headers}) async {
    await _player.setAudioSource(
      AudioSource.uri(
        Uri.parse(url),
        headers: headers,
      ),
    );
    _player.play(); // Do not await, as it blocks until playback finishes.
  }

  @override
  Future<void> playFile(String path) async {
    await _player.setFilePath(path);
    _player.play();
  }

  @override
  Future<void> pause() async {
    await _player.pause();
  }

  @override
  Future<void> resume() async {
    _player.play();
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
