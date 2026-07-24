import 'package:flutter/foundation.dart';
import 'music_service.dart';
import 'yt_explode_service.dart';
import 'ytdlp_native_service.dart';
import 'api_service.dart';

class MusicServiceFactory {
  /// Returns services ordered by priority for the current platform.
  static List<MusicService> create() {
    if (kIsWeb) {
      return [ApiService()];
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return [createYtExplodeService(), ApiService()];
      case TargetPlatform.macOS:
      case TargetPlatform.android:
        return [YtdlpNativeService(), createYtExplodeService(), ApiService()];
      case TargetPlatform.linux:
      case TargetPlatform.windows:
        return [YtdlpNativeService(), createYtExplodeService(), ApiService()];
      default:
        return [ApiService()];
    }
  }
}
