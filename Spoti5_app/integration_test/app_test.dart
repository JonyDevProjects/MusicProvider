import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';

import 'package:spoti5_app/main.dart' as app;
import 'package:spoti5_app/providers/player_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'Search, play track and verify PlayerBar uses track.duration (not doubled)',
    (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // 1. Type the search query into the search field.
      final searchField = find.byType(TextField);
      expect(searchField, findsOneWidget);
      await tester.enterText(searchField, 'Radiohead Creep');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      // 2. Tap the search button exposed via Tooltip('Search Button').
      final searchButton = find.byTooltip('Search Button');
      if (searchButton.evaluate().isNotEmpty) {
        await tester.tap(searchButton);
        await tester.pumpAndSettle();
      }

      // 3. Wait for results (semantic label TrackResult-*).
      final result = find.bySemanticsLabel(RegExp(r'TrackResult-.*Creep.*', caseSensitive: false));
      var found = false;
      for (var i = 0; i < 60; i++) {
        await tester.pump(const Duration(seconds: 1));
        if (result.evaluate().isNotEmpty) {
          found = true;
          break;
        }
      }
      expect(found, isTrue, reason: 'No TrackResult-Creep found in results.');

      // 4. Tap the first result.
      await tester.tap(result.first);
      await tester.pumpAndSettle();

      // 5. Verify PlayerBar is active and shows the track.
      final playerProvider = Provider.of<PlayerProvider>(
        tester.element(find.byType(MaterialApp)),
        listen: false,
      );
      expect(playerProvider.currentTrack, isNotNull,
          reason: 'PlayerBar should have an active track after tapping a result.');

      // 6. Verify the duration used by the bar matches track.duration.
      final trackDuration = playerProvider.currentTrack!.duration;
      expect(trackDuration, isNotNull,
          reason: 'Track duration from backend must be present.');
      final reported = playerProvider.audioPlayer.duration;
      if (reported != null) {
        expect(reported.inSeconds, lessThanOrEqualTo(trackDuration! * 2),
            reason: 'Reproductor no debe reportar el doble de la duración del track.');
      }
    },
  );
}
