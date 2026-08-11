import 'package:audio_video_progress_bar/audio_video_progress_bar.dart';
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

  @override
  Future<void> warmupCache(List<String> videoIds) async {}
}

class FakePlayerProvider extends ChangeNotifier implements PlayerProvider {
  FakePlayerProvider({int trackDurationSeconds = 120})
      : _track = Track(
          id: 'x',
          title: 'Test Track',
          duration: trackDurationSeconds,
        );

  final Track _track;
  bool _playing = false;
  Duration _position = Duration.zero;
  bool togglePlayPauseCalled = false;
  Duration? seekPosition;

  @override
  Track? get currentTrack => _track;

  @override
  bool get isLoading => false;

  @override
  String? get error => null;

  @override
  MusicService get service => FakeMusicService();

  @override
  bool get playing => _playing;

  // Allows test to mutate state and notify
  void setPlaying(bool value) {
    _playing = value;
    notifyListeners();
  }

  @override
  Duration get position => _position;

  void setPosition(Duration value) {
    _position = value;
    notifyListeners();
  }

  @override
  Duration? get duration => const Duration(seconds: 120);

  @override
  Stream<bool> get playingStream => Stream.value(_playing);

  @override
  Stream<Duration> get positionStream => Stream.value(_position);

  @override
  Future<void> playTrack(Track track) async {}

  @override
  Future<List<Track>> searchTracks(String query) async => [];

  @override
  void togglePlayPause() {
    togglePlayPauseCalled = true;
    _playing = !_playing;
    notifyListeners();
  }

  @override
  void seek(Duration position) {
    seekPosition = position;
    _position = position;
    notifyListeners();
  }
}

void main() {
  testWidgets('PlayerBar uses track.duration for total', (tester) async {
    const trackDuration = 120;
    final provider = FakePlayerProvider(trackDurationSeconds: trackDuration);

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
      reason: 'La barra debe usar track.duration',
    );
  });

  testWidgets('PlayerBar toggles play/pause icon', (tester) async {
    final provider = FakePlayerProvider();
    
    await tester.pumpWidget(
      ChangeNotifierProvider<PlayerProvider>.value(
        value: provider,
        child: const MaterialApp(
          home: Scaffold(body: PlayerBar()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Starts paused, so we expect play_arrow
    expect(find.byIcon(Icons.play_arrow), findsOneWidget);
    expect(find.byIcon(Icons.pause), findsNothing);

    // Tap play
    await tester.tap(find.byIcon(Icons.play_arrow));
    await tester.pumpAndSettle();

    expect(provider.togglePlayPauseCalled, isTrue);
    // Since provider toggled playing to true, we expect pause icon
    expect(find.byIcon(Icons.pause), findsOneWidget);
    expect(find.byIcon(Icons.play_arrow), findsNothing);
  });

  testWidgets('PlayerBar seeking updates position', (tester) async {
    final provider = FakePlayerProvider();
    
    await tester.pumpWidget(
      ChangeNotifierProvider<PlayerProvider>.value(
        value: provider,
        child: const MaterialApp(
          home: Scaffold(body: PlayerBar()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Fake a drag/seek on ProgressBar
    final progressBarFinder = find.byType(ProgressBar);
    expect(progressBarFinder, findsOneWidget);

    // Get the center of the progress bar, and tap slightly to the right to seek.
    final Size size = tester.getSize(progressBarFinder);
    final Offset center = tester.getCenter(progressBarFinder);
    final Offset rightOffset = center + Offset(size.width * 0.25, 0); // 75%
    
    await tester.tapAt(rightOffset);
    await tester.pumpAndSettle();

    // Verify seek was called
    expect(provider.seekPosition, isNotNull);
    
    // Check if progress bar position got updated
    final progressBar = tester.widget<ProgressBar>(progressBarFinder);
    expect(progressBar.progress, provider.position);
  });
}
