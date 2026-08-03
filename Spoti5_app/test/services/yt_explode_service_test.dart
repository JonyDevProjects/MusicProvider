import 'package:flutter_test/flutter_test.dart';
import 'package:spoti5_app/services/yt_explode_service_io.dart';

void main() {
  group('YtExplodeService', () {
    late YtExplodeService service;

    setUp(() {
      service = YtExplodeService();
    });

    test('searchTracks returns list of tracks', () async {
      final results = await service.searchTracks('Radiohead Creep');

      expect(results, isNotEmpty);
      expect(results.first.id, isNotEmpty);
      expect(results.first.title, isNotEmpty);
    }, timeout: const Timeout(Duration(seconds: 30)));

    test('getStream returns CDN URL directly (D4: no headers — audioplayers)', () async {
      final searchResults = await service.searchTracks('Radiohead Creep');
      expect(searchResults, isNotEmpty);

      final stream = await service.getStream(searchResults.first.id);

      expect(stream.url, isNotEmpty);
      // D4: audioplayers UrlSource does not support custom headers
      expect(stream.headers, isNull);
    }, timeout: const Timeout(Duration(seconds: 30)));
  });
}
