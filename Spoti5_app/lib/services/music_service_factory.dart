import 'package:flutter/foundation.dart';
import 'music_service.dart';
import 'yt_explode_service.dart';
import 'api_service.dart';

class MusicServiceFactory {
  /// Returns services ordered by priority for the current platform.
  static List<MusicService> create() {
    List<MusicService> services;

    if (kIsWeb) {
      services = [ApiService()];
    } else {
      // Fase 4.5: SDD Opción B (Backend Optimization) - Híbrido desactivado
      services = [ApiService(), createYtExplodeService()];
    }

    if (kDebugMode) {
      debugPrint('MusicServiceFactory: using ${services.map((s) => s.runtimeType.toString()).join(' -> ')}');
    }
    return services;
  }
}

