# Bug: Android Resume Position Offset (1-2 seconds)

## Status: OPEN — awaiting investigation next session

## Summary

On Android, when pausing and resuming playback, the audio correctly resumes from approximately the
paused position, but with a **1-2 second offset** — it resumes slightly *before* the pause point.

iPhone playback resume works correctly (no offset).

## Environment

| Component | Value |
|-----------|-------|
| Platform | Android (RNE L21, API 26, Android 8.0.0) |
| audioplayers | v6.8.1 |
| Connection mode | Local network (`http://192.168.1.46:3000/api`) |
| Stream source | Proxy (`/api/audio/stream?videoId=XFkzRNyygfk`) — HTTP, proxied from YouTube CDN |
| Track | "Radiohead - Creep" (237s) |

## Steps to Reproduce

1. Deploy app to Android: `flutter run --release -d FFY5T17C16022581 --dart-define=BASE_URL=http://192.168.1.46:3000/api`
2. Search for "Radiohead Creep"
3. Tap the first result to start playback
4. Wait ~10-15 seconds into the track
5. Tap the play/pause button to **pause**
6. Tap the play/pause button again to **resume**
7. Observe: audio resumes ~1-2 seconds **before** the pause position

## Current Code (with fix attempt)

File: `Spoti5_app/lib/providers/player_provider.dart`

### Relevant fields:

```dart
String? _currentPlaybackUrl;       // Added — stores URL for resume
Duration _pausedPosition = Duration.zero;  // Added — stores pause position
Duration _position = Duration.zero;       // Existing — updated via onPositionChanged stream
```

### Constructor (unchanged):

```dart
PlayerProvider({List<MusicService>? services})
    : _services = services ?? MusicServiceFactory.create() {
  _audioPlayer.onPositionChanged.listen((pos) {
    _position = pos;
  });
  _audioPlayer.onDurationChanged.listen((dur) {
    _duration = dur;
  });
  _audioPlayer.onPlayerStateChanged.listen((state) {
    if (!_disposed) {
      notifyListeners();
    }
  });
}
```

### `playTrack()` (relevant part):

```dart
// In the else branch (URL source):
debugPrint('[PlayerProvider] Playing from URL: $uri');
_currentPlaybackUrl = result.url;  // ADDED
await _audioPlayer.play(UrlSource(result.url));
```

### `togglePlayPause()` (current fix):

```dart
void togglePlayPause() {
  if (_audioPlayer.state == PlayerState.playing) {
    _pausedPosition = _position;  // Uses stream-updated position
    _audioPlayer.pause();
  } else if (_currentPlaybackUrl != null) {
    final seekPosition = _pausedPosition;
    _pausedPosition = Duration.zero;
    // Listen for first "playing" state, then seek
    _audioPlayer.onPlayerStateChanged
      .where((s) => s == PlayerState.playing)
      .first
      .then((_) => _audioPlayer.seek(seekPosition));
    _audioPlayer.play(UrlSource(_currentPlaybackUrl!));
  }
}
```

## Root Cause Hypotheses

### Hypothesis 1: `_position` is stale
The `onPositionChanged` stream in `audioplayers` v6.x fires at intervals (typically every 200ms on Android).
When the user pauses, `_position` may be up to 200ms behind the actual position. However, the observed
offset is 1-2 seconds, which is larger than 200ms — so this alone cannot explain the full offset.

### Hypothesis 2: `onPositionChanged` fires at 1s intervals on Android
Android's `MediaPlayer` reports position at 1-second intervals when using `OnSeekCompleteListener`.
The `audioplayers` plugin might use `getCurrentPosition()` polling at 1s intervals. This would mean
`_position` could be up to 1 second behind at pause time, plus an additional second of delay
between the user's tap and the position being captured.

### Hypothesis 3: Stream buffering delay during resume
When `play()` is called, the player needs to buffer data from the proxy before it can start playing.
The `onPlayerStateChanged` emits `playing` when `start()` is called, but actual audio playback
starts after buffering. The `seek()` is applied at `playing` state, but the Android MediaPlayer
might seek slightly before the actual playback position is set.

### Hypothesis 4: `_audioPlayer.position` vs `_position` discrepancy
`_audioPlayer.position` queries the native MediaPlayer directly via a method channel call. It might
be more accurate than the stream-updated `_position`. The fix might need to use
`_audioPlayer.position` instead of `_position` at pause time.

## Fix History

| Iteration | Approach | Result |
|-----------|----------|--------|
| 1 | `resume()` | ❌ Silent failure — `resume()` is a no-op on Android after `MEDIA_ERROR_UNKNOWN {what:-38}` |
| 2 | `play()` + `seek()` in `.then()` | ❌ Playback resumed but **started from beginning** (seek applied too late, after audio already started) |
| 3 | `onPlayerStateChanged.where((s) => s == PlayerState.playing).first.then((_) => seek())` before `play()` | ✅ Playback resumes from correct position, but with 1-2s offset (current state) |

## Investigation Tasks (for next session)

- [ ] Add debug logging to `togglePlayPause()` to log `_position`, `_audioPlayer.position`, and `_pausedPosition` at pause and resume time
- [ ] Check if `audioplayers` v6.8.1 has a `setPosition` or `seek` method that works before `play()` is called
- [ ] Test using `_audioPlayer.position` (native query) instead of `_position` (stream) at pause time
- [ ] Check if Android `MediaPlayer.seekTo()` has a different behavior when called before `start()` vs after
- [ ] Consider using `setUrl()` or `setSource()` to pre-set the URL, then `seek()`, then `resume()` — if available in the audioplayers API
- [ ] Check the `audioplayers` v6.8.1 changelog for known seek/resume issues on Android
- [ ] Test on a real Android device with longer tracks to see if the offset is proportional to playback duration or constant

## Related Files

- `Spoti5_app/lib/providers/player_provider.dart` — main fix location
- `Spoti5_app/lib/widgets/player_bar.dart` — uses `togglePlayPause` and `seek`
- `Spoti5_app/lib/services/api_service.dart` — provides stream URLs via proxy
- `src/server.ts` — Express server with `/api/audio/stream` proxy endpoint (supports Range headers)
