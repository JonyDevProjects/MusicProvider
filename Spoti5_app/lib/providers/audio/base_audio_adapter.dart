import 'dart:async';

enum AdapterPlayerState { stopped, playing, paused, completed }

abstract class BaseAudioAdapter {
  Stream<Duration> get onPositionChanged;
  Stream<Duration> get onDurationChanged;
  Stream<AdapterPlayerState> get onPlayerStateChanged;

  AdapterPlayerState get state;

  Future<void> playUrl(String url, {Map<String, String>? headers});
  Future<void> playFile(String path);
  Future<void> pause();
  Future<void> resume();
  Future<void> seek(Duration position);
  Future<void> dispose();
}
