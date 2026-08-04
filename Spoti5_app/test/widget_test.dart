import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:spoti5_app/main.dart';
import 'package:spoti5_app/models/track.dart';
import 'package:spoti5_app/providers/player_provider.dart';
import 'package:spoti5_app/services/music_service.dart';

class FakeMusicService implements MusicService {
  @override
  Future<List<Track>> searchTracks(String query) async => [];

  @override
  Future<StreamResult> getStream(String videoId) async =>
      const StreamResult(url: 'https://example.com/fake');

  @override
  Future<void> warmupCache(List<String> videoIds) async {}
}

void main() {
  testWidgets('App starts correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(
            create: (_) => PlayerProvider(services: [FakeMusicService()]),
          ),
        ],
        child: const Spoti5App(),
      ),
    );

    expect(find.text('Search songs, artists...'), findsOneWidget);
  });
}
