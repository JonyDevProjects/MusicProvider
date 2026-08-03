import 'package:audio_video_progress_bar/audio_video_progress_bar.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
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

/// PlayerProvider fake con un track de duración conocida.
class FakePlayerProvider extends ChangeNotifier implements PlayerProvider {
  FakePlayerProvider(int trackDurationSeconds)
      : _track = Track(
          id: 'x',
          title: 'Test Track',
          duration: trackDurationSeconds,
        );

  final Track _track;

  @override
  Track? get currentTrack => _track;

  @override
  bool get isLoading => false;

  @override
  String? get error => null;

  @override
  AudioPlayer get audioPlayer => AudioPlayer();

  @override
  MusicService get service => FakeMusicService();

  @override
  bool get playing => false;

  @override
  Duration get position => Duration.zero;

  @override
  Duration? get duration => null;

  @override
  Stream<bool> get playingStream => const Stream.empty();

  @override
  Stream<Duration> get positionStream => const Stream.empty();

  @override
  Future<void> playTrack(Track track) async {}

  @override
  Future<List<Track>> searchTracks(String query) async => [];

  @override
  void togglePlayPause() {}

  @override
  void seek(Duration position) {}
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
