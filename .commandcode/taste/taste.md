# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# sdd-workflow
- For /sdd-design (SDD design phase): Use Minimax M3 model. Confidence: 0.65
- For /sdd-verify (SDD verify phase): Use xiaomi/mimo-v2.5 model. Confidence: 0.65

# workflow
See [workflow/taste.md](workflow/taste.md)
# testing-strategy
- For Flutter multiplatform E2E tests: use the official `integration_test` package (not flutter_driver) for iOS and Android, plus Playwright for the web target. Confidence: 0.90
- For Flutter web (CanvasKit) E2E with Playwright: verify values via `aria-label` on semantic nodes (`flt-semantics`), not via DOM text; expose durations on search results (`TrackResult-*`) since `ProgressBar` semantics are not materialized in CanvasKit. Confidence: 0.90
- Android emulator for this project: use the Android CLI (`~/.local/bin/android emulator start medium_phone`), NOT the standard Android SDK (emulator/adb not in PATH). Confidence: 0.90

# spoti5-deploy
- For deploying Spoti5 to a physical iPhone (wireless): use `flutter run --release -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api`, where `MAC_IP` is obtained via `ipconfig getifaddr en0`. Confidence: 0.85

# spoti5-config
- Backend `baseUrl` in `api_service.dart`: detect by platform — `10.0.2.2:3000/api` for Android emulator, `localhost:3000/api` for iOS/Web/Desktop; use `Platform.isAndroid` with a `stub_io.dart` for web builds. Confidence: 0.90
- PlayerBar duration: always use `track.duration` from the backend (yt-dlp seconds) for the progress bar total, never `audioPlayer.duration` (just_audio may report double). Confidence: 0.95
