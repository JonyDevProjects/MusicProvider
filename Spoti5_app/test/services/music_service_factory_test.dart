import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spoti5_app/services/music_service_factory.dart';
import 'package:spoti5_app/services/music_service.dart';
import 'package:spoti5_app/services/yt_explode_service_io.dart';
import 'package:spoti5_app/services/ytdlp_native_service.dart';
import 'package:spoti5_app/services/api_service.dart';

void main() {
  group('MusicServiceFactory', () {
    test('iOS uses YtExplodeService as primary with ApiService fallback', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;

      final services = MusicServiceFactory.create();

      expect(services.length, 2);
      expect(services[0], isA<YtExplodeService>());
      expect(services[1], isA<ApiService>());

      debugDefaultTargetPlatformOverride = null;
    });

    test('macOS uses YtdlpNativeService as primary', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.macOS;

      final services = MusicServiceFactory.create();

      expect(services.length, 3);
      expect(services[0], isA<YtdlpNativeService>());
      expect(services[1], isA<YtExplodeService>());
      expect(services[2], isA<ApiService>());

      debugDefaultTargetPlatformOverride = null;
    });

    test('Android uses YtdlpNativeService as primary', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;

      final services = MusicServiceFactory.create();

      expect(services.length, 3);
      expect(services[0], isA<YtdlpNativeService>());
      expect(services[1], isA<YtExplodeService>());
      expect(services[2], isA<ApiService>());

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
