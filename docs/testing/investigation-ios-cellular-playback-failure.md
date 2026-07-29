# Investigation: iOS Cellular Playback Failure

**Date**: 2026-07-29
**Device**: Jonathan's iPhone (iPhone 12 mini, iOS 18.7.8)
**Branch**: `feature/ios-youtube-explode`
**Investigator**: CommandCode

---

## Problem Summary

After implementing `YtExplodeService` (youtube_explode_dart) for iOS to enable backend-free playback, the app works correctly on the same WiFi network as the Mac (per test report `docs/testing/manual-test-ios-physical-2026-07-28-post-fix.md` on `develop` branch). However, when the iPhone is on a **different network** (cellular, connected via USB), **search works but audio playback fails**.

> **NOTE**: The "works on WiFi" claim is based on the test report from the `develop` branch (2026-07-28). The current code on `feature/ios-youtube-explode` has NOT been verified on WiFi. The Info.plist fix (`NSAllowsArbitraryLoads`) was applied to `develop` but was NOT present on `feature/ios-youtube-explode` until this investigation. Verification on WiFi with current code is still pending.

The user requires the app to work **without a backend** (no Node.js server on the Mac).

---

## Investigation Process

### Test 1: Initial Diagnosis (NSAllowsLocalNetworking)
- **Info.plist**: `NSAllowsLocalNetworking` (original, not the fix from test report)
- **Result**: `(-1) unknown error` and `(-11828) Cannot Open`
- **Finding**: Info.plist fix (`NSAllowsArbitraryLoads`) was NOT applied on this branch

### Test 2: After Info.plist Fix
- **Info.plist**: `NSAllowsArbitraryLoads` (applied)
- **just_audio**: 0.9.46
- **Result**: Still `(-1) unknown error`
- **Finding**: ATS is not the issue

### Test 3: Codec Selection Fix
- **Issue found**: `s.codec.subtype` returns "mp4" or "webm" (container), not the codec string
- **Fix**: Changed to `s.audioCodec` which returns "mp4a.40.2" etc.
- **Issue found**: `sortByBitrate()` returns **descending** order (highest first), so `reversed` iterated from lowest to highest, selecting low-quality HE-AAC instead of AAC-LC
- **Fix**: Iterate `audioOnly` directly (highest to lowest)
- **Result**: Correctly selects `127.64 Kbit/s mp4a.40.2` (AAC-LC, iOS compatible)
- **Playback**: Still `(-1) unknown error`

### Test 4: just_audio Upgrade
- **just_audio**: Upgraded from 0.9.46 to 0.10.6
- **Result**: Still `(-1) unknown error` (different stack trace but same error)

### Test 5: Headers = null (bypass proxy)
- **Headers**: `null` (no proxy, direct AVPlayer connection)
- **Result**: Still `(-1) unknown error`
- **Finding**: The proxy is NOT the issue

### Test 6: HTTP Diagnostic
- **HTTP HEAD request**: `403 Forbidden` (YouTube blocks HEAD requests)
- **HTTP GET with Range request**: `206 Partial Content` ✅
- **Content-Type**: `audio/mp4`
- **Content-Length**: 1024 bytes (first chunk)
- **Finding**: **The YouTube CDN URL IS accessible and valid!**

### Test 7: iOS User-Agent Header
- **Headers**: `{'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 ...'}`
- **HTTP GET**: Still `206 Partial Content` ✅
- **just_audio**: Still `(-1) unknown error`
- **Finding**: The User-Agent is NOT the issue

---

## Key Findings

| Factor | Status | Evidence |
|--------|--------|----------|
| YouTube CDN URL validity | ✅ Valid | HTTP GET returns 206 with audio/mp4 |
| Codec compatibility | ✅ Fixed | AAC-LC (mp4a.40.2) selected, iOS compatible |
| Info.plist ATS | ✅ Fixed | NSAllowsArbitraryLoads applied |
| User-Agent header | ✅ Tested | URL accessible with iPhone UA via HTTP |
| just_audio version | ✅ Tested | 0.9.46 and 0.10.6 both fail |
| Proxy (headers) | ✅ Tested | Fails with and without headers |
| Network connectivity | ✅ Working | Search and HTTP GET both work |

**The YouTube CDN URL is accessible via HTTP (Dart HTTP client) but AVPlayer (used by just_audio) cannot play it on cellular.**

> **UNVERIFIED**: The claim that AVPlayer works on WiFi is based on the `develop` branch test report, not the current code. This needs verification.

---

## Root Cause Analysis

The `(-1) unknown error` originates from AVPlayer (iOS native) via `just_audio`'s platform channel. Since:
1. The URL is valid and accessible via HTTP
2. The codec is iOS-compatible
3. The network is functional (search works, HTTP GET works)
4. The error persists across just_audio versions, headers, and ATS settings

> **IMPORTANT**: The claim that "AVPlayer works on WiFi but fails on cellular" is based on the test report from the `develop` branch (2026-07-28). This has NOT been verified with the current code on `feature/ios-youtube-explode`. It is possible that the current code also fails on WiFi, which would mean the root cause is different from what we suspect.

The most likely causes are:

### 1. IPv6 vs IPv4 (Most Likely)
- **Cellular networks** commonly use **IPv6** (or IPv4-mapped IPv6)
- **WiFi networks** typically use **IPv4**
- AVPlayer might have a bug or configuration issue with IPv6 connections to YouTube CDN
- The Dart HTTP client might handle IPv6 correctly, but AVPlayer might not
- **Evidence**: Works on WiFi (IPv4), fails on cellular (IPv6)

### 2. AVPlayer TLS/HTTPS Bug on iOS 18
- iOS 18.7.8 is a very recent version
- AVPlayer might have a regression in TLS handshake or HTTPS connection handling
- The Dart HTTP client uses Dart's TLS stack, while AVPlayer uses iOS's native TLS
- **Evidence**: HTTP GET works (Dart TLS), AVPlayer fails (native TLS)

### 3. YouTube CDN URL Length or Format
- YouTube CDN URLs are very long (300+ characters) with many query parameters
- AVPlayer might have a URL length limit or parsing issue
- **Evidence**: Works on WiFi (same URL format), fails on cellular

### 4. just_audio iOS Implementation Bug
- `just_audio` 0.10.6 might have a bug in its iOS AVPlayer integration
- The proxy approach (when headers are passed) might not work correctly on iOS 18
- **Evidence**: Both proxy and direct connection fail

---

## Possible Solutions

### Solution A: Use ApiService as Audio Proxy (Immediate)
- Route audio playback through the Node.js backend
- The backend uses yt-dlp to get the stream URL and proxies it
- **Pros**: Works immediately, no client-side changes needed
- **Cons**: Requires backend running on Mac, defeats the purpose of backend-free playback

### Solution B: Download and Play from Memory (Medium-term)
- Use `youtube_explode_dart` to get the stream URL
- Download the audio data using Dart HTTP client (which works)
- Play the downloaded data using `just_audio`'s `AudioSource.memory()`
- **Pros**: No backend needed, uses working HTTP client
- **Cons**: High memory usage, no seeking, buffering issues, not suitable for long tracks

### Solution C: Use just_audio with Progressive Download (Medium-term)
- Download the audio to a temporary file using Dart HTTP client
- Play the file using `just_audio`'s `AudioSource.file()`
- **Pros**: No backend needed, supports seeking
- **Cons**: Requires disk space, download time before playback, no true streaming

### Solution D: Fix AVPlayer/just_audio Issue (Long-term)
- Investigate and fix the root cause in AVPlayer or just_audio
- Possible approaches:
  - Force IPv4 in AVPlayer (if possible)
  - Use a different audio player library (e.g., `audioplayers`, `video_player`)
  - Patch just_audio's iOS implementation
  - Upgrade to a newer just_audio version that fixes iOS 18 issues
- **Pros**: True streaming, no backend needed
- **Cons**: Requires deep investigation, might need upstream fixes

### Solution E: Use YtdlpNativeService on iOS (Long-term)
- The Rust FFI yt-dlp service works on macOS, Android, Linux, Windows
- Port the Rust binary to iOS (or use a different approach for iOS)
- **Pros**: Native performance, no Dart HTTP issues
- **Cons**: iOS doesn't allow executing external binaries, requires significant work

### Solution F: Hybrid Approach (Recommended Short-term)
- Keep `YtExplodeService` as primary (works for search and URL resolution)
- When `just_audio` fails with `(-1) unknown error`, fall back to `ApiService`
- `ApiService` proxies the stream through the backend
- **Pros**: Works on all networks, graceful degradation
- **Cons**: Requires backend when on cellular

---

## Files Modified During Investigation

1. `Spoti5_app/ios/Runner/Info.plist` — Changed `NSAllowsLocalNetworking` to `NSAllowsArbitraryLoads`
2. `Spoti5_app/lib/services/yt_explode_service_io.dart` — Fixed codec selection (using `audioCodec` instead of `codec.subtype`, iterate highest-to-lowest bitrate)
3. `Spoti5_app/lib/providers/player_provider.dart` — Added diagnostic logging (HTTP HEAD/GET requests)
4. `Spoti5_app/pubspec.yaml` — Upgraded `just_audio` from `^0.9.36` to `^0.10.6`

---

## Recommendations

1. **Priority 1**: Verify current code on WiFi (same network as Mac) to confirm the "works on WiFi" claim
2. **Short-term**: Implement Solution F (hybrid approach) — keep YtExplodeService as primary, fall back to ApiService when just_audio fails
3. **Medium-term**: Investigate Solution D — test with `audioplayers` package or force IPv4 in AVPlayer
4. **Long-term**: Monitor just_audio releases for iOS 18 fixes

---

## Test Report Reference

- **Previous successful test**: `docs/testing/manual-test-ios-physical-2026-07-28-post-fix.md`
- That test was on the `develop` branch with WiFi, and may have had different code/dependencies
- The `NSAllowsArbitraryLoads` fix was applied on `develop` but NOT on `feature/ios-youtube-explode`
