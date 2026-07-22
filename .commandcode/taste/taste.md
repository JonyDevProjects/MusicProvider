# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# sdd-workflow
- For /sdd-design (SDD design phase): Use Minimax M3 model. Confidence: 0.65
- For /sdd-verify (SDD verify phase): Use xiaomi/mimo-v2.5 model. Confidence: 0.65

# workflow
See [workflow/taste.md](workflow/taste.md)
# architecture
- For macOS builds that execute external binaries (e.g., yt-dlp via Rust FRB): disable App Sandbox by setting `com.apple.security.app-sandbox` to `false` in `DebugProfile.entitlements` (and `Release.entitlements` for non-App Store builds), otherwise `Command::new` fails with `Operation not permitted`. Confidence: 0.75
- Use Flutter Rust Bridge (FRB) for integrating yt-dlp natively into the mobile app, enabling shared Rust code with Nuclear's ecosystem. Confidence: 0.65
- For Rust cross-compilation to iOS (`aarch64-apple-ios`) with `zstd-sys`/C deps that fail on `___chkstk_darwin`: use `IPHONEOS_DEPLOYMENT_TARGET=15.0 cargo build --target aarch64-apple-ios --release` (`.cargo/config.toml` rustflags are overridden by the target's default `-target arm64-apple-ios10.0.0`). Confidence: 0.70
- When flutter_rust_bridge Rust lib is statically linked via CocoaPods on iOS (`.a` file), use `ExternalLibrary.process(iKnowHowToUseIt: true)` and add `s.static_framework = true` to the podspec instead of relying on default `.framework` loading. Confidence: 0.70

# testing-strategy
- For Flutter multiplatform E2E tests: use the official `integration_test` package (not flutter_driver) for iOS and Android, plus Playwright for the web target. Confidence: 0.90
- For Flutter web (CanvasKit) E2E with Playwright: verify values via `aria-label` on semantic nodes (`flt-semantics`), not via DOM text; expose durations on search results (`TrackResult-*`) since `ProgressBar` semantics are not materialized in CanvasKit. Confidence: 0.90
- Android emulator for this project: use the Android CLI (`~/.local/bin/android emulator start medium_phone`), NOT the standard Android SDK (emulator/adb not in PATH). Confidence: 0.90

# spoti5-deploy
- For deploying Spoti5 to a physical iPhone (wireless): use `flutter run --release -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api`, where `MAC_IP` is obtained via `ipconfig getifaddr en0`. Confidence: 0.85
- Spotti5 app embeds backend logic (via FRB/yt-dlp native integration) so starting the Node.js backend on the Mac is not required — the app handles it directly. Confidence: 0.70

# spoti5-config
- Backend `baseUrl` in `api_service.dart`: detect by platform — `10.0.2.2:3000/api` for Android emulator, `localhost:3000/api` for iOS/Web/Desktop; use `Platform.isAndroid` with a `stub_io.dart` for web builds. Confidence: 0.90
- PlayerBar duration: always use `track.duration` from the backend (yt-dlp seconds) for the progress bar total, never `audioPlayer.duration` (just_audio may report double). Confidence: 0.95
