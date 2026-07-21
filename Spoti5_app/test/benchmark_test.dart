import 'package:flutter_test/flutter_test.dart';
import 'package:spoti5_app/native/ytdlp_service.dart';
import 'package:spoti5_app/native/frb_generated.dart';

void main() {
  group('YtDlp Native Benchmark', () {
    late YtDlpService service;

    setUpAll(() async {
      // Initialize RustLib before running tests
      await RustLib.init();
    });

    setUp(() {
      service = YtDlpService.instance;
    });

    test('Search latency benchmark', () async {
      // Initialize service
      await service.initialize();

      // Warm up
      await service.search('test', limit: 1);

      // Benchmark search
      final stopwatch = Stopwatch()..start();
      final results = await service.search('Radiohead Creep', limit: 10);
      stopwatch.stop();

      print('Search latency: ${stopwatch.elapsedMilliseconds}ms');
      print('Results found: ${results.length}');

      // Verify results
      expect(results, isNotEmpty);
      expect(stopwatch.elapsedMilliseconds, lessThan(5000)); // Should be under 5 seconds
    });

    test('Stream info latency benchmark', () async {
      // Initialize service
      await service.initialize();

      // First search to get a video ID
      final searchResults = await service.search('Radiohead Creep', limit: 1);
      expect(searchResults, isNotEmpty);

      final videoId = searchResults.first.id;

      // Benchmark stream info
      final stopwatch = Stopwatch()..start();
      final streamInfo = await service.getStreamInfo(videoId);
      stopwatch.stop();

      print('Stream info latency: ${stopwatch.elapsedMilliseconds}ms');
      print('Stream URL: ${streamInfo.streamUrl.substring(0, 50)}...');

      // Verify stream info
      expect(streamInfo.streamUrl, isNotEmpty);
      expect(stopwatch.elapsedMilliseconds, lessThan(10000)); // Should be under 10 seconds
    });

    test('Multiple searches benchmark', () async {
      // Initialize service
      await service.initialize();

      final queries = [
        'Radiohead Creep',
        'Nirvana Smells Like Teen Spirit',
        'Queen Bohemian Rhapsody',
      ];

      final latencies = <int>[];

      for (final query in queries) {
        final stopwatch = Stopwatch()..start();
        final results = await service.search(query, limit: 5);
        stopwatch.stop();

        latencies.add(stopwatch.elapsedMilliseconds);
        print('Search "$query": ${stopwatch.elapsedMilliseconds}ms (${results.length} results)');
      }

      final avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
      print('Average search latency: ${avgLatency.toStringAsFixed(2)}ms');

      // Verify average latency is reasonable
      expect(avgLatency, lessThan(3000)); // Average should be under 3 seconds
    });
  });
}