import 'package:audio_video_progress_bar/audio_video_progress_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:just_audio/just_audio.dart';
import 'package:provider/provider.dart';

import 'package:spoti5_app/models/track.dart';
import 'package:spoti5_app/providers/player_provider.dart';
import 'package:spoti5_app/services/music_service.dart';
import 'package:spoti5_app/widgets/player_bar.dart';

class FakeMusicService implements MusicService {
  @override
  Future<List<Track>> searchTracks(String query) async => [];

  @override
  Future<StreamResult> getStream(String videoId) async =>
      const StreamResult(url: 'https://example.com/fake');
}

/// Fake de AudioPlayer que reporta el DOBLE de la duración real del track,
/// simulando el bug de just_audio (audioPlayer.duration == 2x track.duration).
class FakeAudioPlayer extends AudioPlayer {
  FakeAudioPlayer(this._reportedDuration);

  final Duration _reportedDuration;

  @override
  Duration? get duration => _reportedDuration;

  @override
  Stream<Duration> get positionStream => Stream.value(Duration.zero);

  @override
  Stream<bool> get playingStream => Stream.value(false);
}

/// PlayerProvider fake con un track de duración conocida.
class FakePlayerProvider extends ChangeNotifier implements PlayerProvider {
  FakePlayerProvider(int trackDurationSeconds)
      : _track = Track(
          id: 'x',
          title: 'Test Track',
          duration: trackDurationSeconds,
        ),
        _audioPlayer =
            FakeAudioPlayer(Duration(seconds: trackDurationSeconds * 2));

  final Track _track;
  final FakeAudioPlayer _audioPlayer;

  @override
  Track? get currentTrack => _track;

  @override
  bool get isLoading => false;

  @override
  AudioPlayer get audioPlayer => _audioPlayer;

  @override
  MusicService get service => FakeMusicService();

  @override
  Future<void> playTrack(Track track) async {}

  @override
  Future<List<Track>> searchTracks(String query) async => [];

  @override
  void togglePlayPause() {}
}

void main() {
  testWidgets(
    'PlayerBar uses track.duration for total, not doubled audioPlayer.duration',
    (tester) async {
      const trackDuration = 120; // segundos reales del track
      final provider = FakePlayerProvider(trackDuration);

      await tester.pumpWidget(
        ChangeNotifierProvider<PlayerProvider>.value(
          value: provider,
          child: const MaterialApp(
            home: Scaffold(body: PlayerBar()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final progressBar = tester.widget<ProgressBar>(
        find.byType(ProgressBar),
      );

      expect(
        progressBar.total,
        const Duration(seconds: trackDuration),
        reason: 'La barra debe usar track.duration, no audioPlayer.duration (doble).',
      );
    },
  );
}
