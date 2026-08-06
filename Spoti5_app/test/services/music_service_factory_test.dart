import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spoti5_app/services/music_service_factory.dart';
import 'package:spoti5_app/services/music_service.dart';
import 'package:spoti5_app/services/yt_explode_service_io.dart';
import 'package:spoti5_app/services/api_service.dart';

void main() {
  group('MusicServiceFactory', () {
    test('iOS uses ApiService as primary with YtExplodeService fallback', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;

      final services = MusicServiceFactory.create();

      expect(services.length, 2);
      expect(services[0], isA<ApiService>());
      expect(services[1], isA<YtExplodeService>());

      debugDefaultTargetPlatformOverride = null;
    });

    test('macOS uses ApiService as primary with YtExplodeService fallback', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.macOS;

      final services = MusicServiceFactory.create();

      expect(services.length, 2);
      expect(services[0], isA<ApiService>());
      expect(services[1], isA<YtExplodeService>());

      debugDefaultTargetPlatformOverride = null;
    });

    test('Android uses ApiService as primary with YtExplodeService fallback', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;

      final services = MusicServiceFactory.create();

      expect(services.length, 2);
      expect(services[0], isA<ApiService>());
      expect(services[1], isA<YtExplodeService>());

      debugDefaultTargetPlatformOverride = null;
    });

    test('all services implement MusicService', () {
      final services = MusicServiceFactory.create();

      for (final service in services) {
        expect(service, isA<MusicService>());
      }
    });
  });
}
