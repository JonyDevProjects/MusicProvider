import 'package:flutter/foundation.dart';
import 'music_service.dart';
import 'yt_explode_service.dart';
import 'ytdlp_native_service.dart';
import 'api_service.dart';

class MusicServiceFactory {
  /// Returns services ordered by priority for the current platform.
  static List<MusicService> create() {
    List<MusicService> services;
    if (kIsWeb) {
      services = [ApiService()];
    } else {
      switch (defaultTargetPlatform) {
        case TargetPlatform.iOS:
          services = [createYtExplodeService(), ApiService()];
        case TargetPlatform.macOS:
        case TargetPlatform.android:
          services = [YtdlpNativeService(), createYtExplodeService(), ApiService()];
        case TargetPlatform.linux:
        case TargetPlatform.windows:
          services = [YtdlpNativeService(), createYtExplodeService(), ApiService()];
        default:
          services = [ApiService()];
      }
    }

    if (kDebugMode) {
      debugPrint('MusicServiceFactory: using ${services.map((s) => s.runtimeType.toString()).join(' -> ')}');
    }
    return services;
  }
}
