import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:provider/provider.dart';

import 'package:spoti5_app/main.dart' as app;
import 'package:spoti5_app/providers/player_provider.dart';
import 'package:spoti5_app/services/yt_explode_service_io.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Generic playback test for iOS cellular (D1/D2/D3/C)', (tester) async {
    YtExplodeService.clearLog();

    app.main();
    await tester.pumpAndSettle();

    // 1. Search "Radiohead Creep"
    final searchField = find.byType(TextField);
    expect(searchField, findsOneWidget);
    await tester.enterText(searchField, 'Radiohead Creep');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();

    final searchButton = find.byTooltip('Search Button');
    if (searchButton.evaluate().isNotEmpty) {
      await tester.tap(searchButton);
      await tester.pumpAndSettle();
    }

    // 2. Wait for results and tap first
    final result = find.bySemanticsLabel(RegExp(r'TrackResult-.*Creep.*', caseSensitive: false));
    var found = false;
    for (var i = 0; i < 60; i++) {
      await tester.pump(const Duration(seconds: 1));
      if (result.evaluate().isNotEmpty) {
        found = true;
        break;
      }
    }
    expect(found, isTrue, reason: 'No TrackResult-Creep found in search results.');

    // 3. Tap to play
    final playerProvider = Provider.of<PlayerProvider>(
      tester.element(find.byType(MaterialApp)),
      listen: false,
    );

    final playStart = DateTime.now();
    await tester.tap(result.first);
    await tester.pump(const Duration(milliseconds: 100));

    // 4. Wait for playback to start or timeout (30s)
    var playbackStarted = false;
    for (var i = 0; i < 30; i++) {
      await tester.pump(const Duration(seconds: 1));
      final position = playerProvider.position;
      if (!playbackStarted && position > Duration.zero) {
        playbackStarted = true;
        final elapsed = DateTime.now().difference(playStart);
        debugPrint('Playback started after ~$elapsed (position: $position)');
      }
      if (playbackStarted) break;
    }

    // 5. Wait a few more seconds for any late logs
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(seconds: 1));
    }

    // 6. Print all YtExplodeService logs for analysis
    debugPrint('=== YtExplodeService LOG BUFFER ===');
    for (final l in YtExplodeService.logBuffer) {
      debugPrint(l);
    }
    debugPrint('=== END LOG BUFFER ===');

    // 7. Print final player state
    debugPrint('Final: playing=${playerProvider.playing}, position=${playerProvider.position}');
    debugPrint('RESULT: ${playbackStarted ? "SUCCESS" : "NO_PLAYBACK"}');
  }, timeout: const Timeout(Duration(minutes: 6)));
}
