# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# sdd-workflow
- For /sdd-design (SDD design phase): Use Minimax M3 model. Confidence: 0.65
- For /sdd-verify (SDD verify phase): Use xiaomi/mimo-v2.5 model. Confidence: 0.65

# workflow
See [workflow/taste.md](workflow/taste.md)
# architecture
See [architecture/taste.md](architecture/taste.md)
# language
- Communicate with the user in Spanish (Español). Confidence: 0.95

# platform
- Prefers using Mac (Apple Silicon / M1) over Windows PC for tasks — defaults to Mac-based solutions rather than seeking a PC. Confidence: 0.75

# testing-strategy
- For Flutter multiplatform E2E tests: use the official `integration_test` package (not flutter_driver) for iOS and Android, plus Playwright for the web target. Confidence: 0.90
- For Flutter web (CanvasKit) E2E with Playwright: verify values via `aria-label` on semantic nodes (`flt-semantics`), not via DOM text; expose durations on search results (`TrackResult-*`) since `ProgressBar` semantics are not materialized in CanvasKit. Confidence: 0.90
- Android emulator for this project: use the Android CLI (`~/.local/bin/android emulator start medium_phone`), NOT the standard Android SDK (emulator/adb not in PATH). Confidence: 0.90

# spoti5-deploy
- For deploying Spoti5 to a physical iPhone (wireless): use `flutter run --release -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api`, where `MAC_IP` is obtained via `ipconfig getifaddr en0`. Confidence: 0.85
- Spotti5 app embeds backend logic (via FRB/yt-dlp native integration) so starting the Node.js backend on the Mac is not required — the app handles it directly. User explicitly rejects solutions that depend on the backend running on the Mac. Confidence: 0.85

# spoti5-config
- Backend `baseUrl` in `api_service.dart`: detect by platform — `10.0.2.2:3000/api` for Android emulator, `localhost:3000/api` for iOS/Web/Desktop; use `Platform.isAndroid` with a `stub_io.dart` for web builds. Confidence: 0.90
- PlayerBar duration: always use `track.duration` from the backend (yt-dlp seconds) for the progress bar total, never `audioPlayer.duration` (just_audio may report double). Confidence: 0.95
- For fixing YouTube HTTP 403 on audio playback: use `AudioSource.uri` with headers (`User-Agent: Mozilla/5.0`) instead of `setUrl()`. Confidence: 0.90
- On iOS (which blocks `exec()` of external binaries), use `youtube_explode_dart` (pure Dart) as the primary music service via the Strategy Pattern. Confidence: 0.80


