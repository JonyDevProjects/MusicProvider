// Stub de `dart:io` para targets web (donde `dart:io` no está disponible).
// Permite usar `Platform.isAndroid` en api_service.dart sin romper la compilación web.
class Platform {
  static const bool isAndroid = false;
  static const bool isIOS = false;
}
