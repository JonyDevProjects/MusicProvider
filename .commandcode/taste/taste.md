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
See [testing-strategy/taste.md](testing-strategy/taste.md)
# spoti5-deploy
- For deploying Spoti5 to a physical iPhone (wireless): use `flutter run --release -d <deviceId> --dart-define=BASE_URL=http://<MAC_IP>:3000/api`, where `MAC_IP` is obtained via `ipconfig getifaddr en0`. Confidence: 0.85
- For deploying Spoti5 to a physical Android device: user prefers USB connection (not wireless/debuggable network), detecting via `flutter devices` then `adb devices`, with `BASE_URL=http://<MAC_IP>:3000/api` for local-network backend access. Confidence: 0.75
- Spotti5 app embeds backend logic (via FRB/yt-dlp native integration) so starting the Node.js backend on the Mac is not required — the app handles it directly. User explicitly rejects solutions that depend on the backend running on the Mac. Confidence: 0.85
- Uses Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:<PORT>`) to expose a local backend service via a public HTTPS URL (`*.trycloudflare.com`) for testing on physical devices (iOS and Android) when local network access is unavailable (e.g., cellular data only). Passes the tunnel URL as `BASE_URL` via `--dart-define`. Confidence: 0.80
- When testing Flutter web through a Cloudflare Tunnel, the web build's compiled `BASE_URL` must be set to the tunnel URL via `--dart-define=BASE_URL=<tunnel_url>/api` before running Playwright tests — otherwise the web app's API calls go to the hardcoded local URL (e.g., localhost:3000) and fail with `Failed to fetch`. Confidence: 0.80

# spoti5-config
See [spoti5-config/taste.md](spoti5-config/taste.md)
