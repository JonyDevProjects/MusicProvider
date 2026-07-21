//! yt-dlp binary management
//! 
//! This module handles downloading, extracting, and updating the yt-dlp binary.

use crate::{YtDlpError, YtDlpResult};
use log::{debug, error, info};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const RELEASE_BASE_URL: &str =
    "https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download";
const UPDATE_CHECK_INTERVAL_SECS: u64 = 3600;

/// Update check information
#[derive(serde::Serialize, serde::Deserialize)]
struct UpdateCheck {
    tag: String,
    checked_at: u64,
}

impl UpdateCheck {
    fn now(tag: String) -> Self {
        Self {
            tag,
            checked_at: now_unix(),
        }
    }
}

/// GitHub release information
#[derive(serde::Deserialize)]
struct GitHubRelease {
    tag_name: String,
}

/// Get the release filename for the current platform
fn release_filename() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "yt-dlp_macos.zip"
    }
    #[cfg(target_os = "ios")]
    {
        // iOS uses the macOS binary for simulator; real devices need a different approach
        "yt-dlp_macos.zip"
    }
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        "yt-dlp_linux.zip"
    }
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    {
        "yt-dlp_linux_aarch64.zip"
    }
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    {
        "yt-dlp_win.zip"
    }
    #[cfg(all(target_os = "windows", target_arch = "aarch64"))]
    {
        "yt-dlp_win_arm64.zip"
    }
}

/// Get the binary name for the current platform
fn binary_name() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "yt-dlp_macos"
    }
    #[cfg(target_os = "ios")]
    {
        // iOS uses the macOS binary for simulator; real devices need a different approach
        "yt-dlp_macos"
    }
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        "yt-dlp_linux"
    }
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    {
        "yt-dlp_linux_aarch64"
    }
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    {
        "yt-dlp.exe"
    }
    #[cfg(all(target_os = "windows", target_arch = "aarch64"))]
    {
        "yt-dlp_win_arm64.exe"
    }
}

/// Get the yt-dlp directory
fn ytdlp_dir() -> YtDlpResult<PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| YtDlpError::Other("Could not find home directory".to_string()))?;
    
    let dir = PathBuf::from(home).join(".spoti5").join("ytdlp");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

/// Download a file from URL to destination
async fn download_file(url: &str, dest: &Path) -> YtDlpResult<()> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(300))
        .connect_timeout(Duration::from_secs(30))
        .build()?;

    let response = client.get(url).send().await?;

    if !response.status().is_success() {
        return Err(YtDlpError::NetworkError(format!("HTTP error: {}", response.status())));
    }

    let bytes = response.bytes().await?;
    fs::write(dest, bytes)?;
    
    info!("[yt-dlp] Downloaded {} to {:?}", url, dest);
    Ok(())
}

/// Extract a zip file to destination
fn extract_zip(zip_path: &Path, dest: &Path) -> YtDlpResult<()> {
    use std::io::BufReader;
    use zip::ZipArchive;

    let file = fs::File::open(zip_path)?;
    let mut archive = ZipArchive::new(BufReader::new(file))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)?;
        let out_path = dest.join(entry.mangled_name());

        if entry.is_dir() {
            fs::create_dir_all(&out_path)?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent)?;
            }
            let mut out_file = fs::File::create(&out_path)?;
            std::io::copy(&mut entry, &mut out_file)?;

            #[cfg(unix)]
            if let Some(mode) = entry.unix_mode() {
                use std::os::unix::fs::PermissionsExt;
                fs::set_permissions(&out_path, fs::Permissions::from_mode(mode))?;
            }
        }
    }

    info!("[yt-dlp] Extracted {:?} to {:?}", zip_path, dest);
    Ok(())
}

/// Get current Unix timestamp
fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Get the update check file path
fn update_check_path(ytdlp_dir: &Path) -> PathBuf {
    ytdlp_dir.join(".update_check")
}

/// Read update check information
fn read_update_check(ytdlp_dir: &Path) -> Option<UpdateCheck> {
    let path = update_check_path(ytdlp_dir);
    let contents = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&contents).ok()
}

/// Write update check information
fn write_update_check(ytdlp_dir: &Path, check: &UpdateCheck) {
    let path = update_check_path(ytdlp_dir);
    let json = match serde_json::to_string(check) {
        Ok(json) => json,
        Err(err) => {
            error!("[yt-dlp] Failed to serialize update check: {}", err);
            return;
        }
    };

    if let Err(err) = fs::write(&path, &json) {
        error!("[yt-dlp] Failed to write update check file: {}", err);
    }
}

/// Download and extract yt-dlp binary
async fn download_and_extract(ytdlp_dir: &Path, binary_path: &Path) -> YtDlpResult<()> {
    let download_url = format!("{}/{}", RELEASE_BASE_URL, release_filename());
    let zip_path = ytdlp_dir.join(".download.zip");

    fs::create_dir_all(ytdlp_dir)?;

    download_file(&download_url, &zip_path).await
        .inspect_err(|_| {
            fs::remove_file(&zip_path).ok();
        })?;

    extract_zip(&zip_path, ytdlp_dir)?;
    fs::remove_file(&zip_path).ok();

    if !binary_path.exists() {
        return Err(YtDlpError::BinaryNotFound(format!(
            "Binary not found after extraction: {:?}",
            binary_path
        )));
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(binary_path, fs::Permissions::from_mode(0o755))?;
    }

    Ok(())
}

/// Fetch the latest release tag from GitHub
async fn fetch_latest_release_tag() -> YtDlpResult<String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?;

    let response = client
        .get("https://api.github.com/repos/yt-dlp/yt-dlp-nightly-builds/releases/latest")
        .header("User-Agent", "spoti5-app")
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(YtDlpError::NetworkError(format!("GitHub API HTTP error: {}", response.status())));
    }

    let release: GitHubRelease = response.json().await?;
    Ok(release.tag_name)
}

/// Check for updates and download if needed
async fn check_for_update(ytdlp_dir: &Path, binary_path: &Path) {
    let existing = read_update_check(ytdlp_dir);

    if let Some(ref check) = existing {
        let elapsed = now_unix().saturating_sub(check.checked_at);
        if elapsed < UPDATE_CHECK_INTERVAL_SECS {
            debug!("[yt-dlp] Last update check was {}s ago, skipping", elapsed);
            return;
        }
    }

    let existing_tag = existing.map(|check| check.tag);

    let latest_tag = match fetch_latest_release_tag().await {
        Ok(tag) => tag,
        Err(err) => {
            error!("[yt-dlp] Update check failed: {}", err);
            if let Some(tag) = existing_tag {
                write_update_check(ytdlp_dir, &UpdateCheck::now(tag));
            }
            return;
        }
    };

    let needs_update = existing_tag.as_ref().map_or(true, |tag| *tag != latest_tag);

    if !needs_update {
        debug!("[yt-dlp] Already on latest version: {}", latest_tag);
        write_update_check(ytdlp_dir, &UpdateCheck::now(latest_tag));
        return;
    }

    info!("[yt-dlp] New version available: {}, updating...", latest_tag);

    match download_and_extract(ytdlp_dir, binary_path).await {
        Ok(()) => {
            info!("[yt-dlp] Updated to {}", latest_tag);
            write_update_check(ytdlp_dir, &UpdateCheck::now(latest_tag));
        }
        Err(err) => {
            error!("[yt-dlp] Update download failed: {}", err);
            if let Some(tag) = existing_tag {
                write_update_check(ytdlp_dir, &UpdateCheck::now(tag));
            }
        }
    }
}

/// Ensure yt-dlp is installed and up to date
pub async fn ensure_installed() -> YtDlpResult<bool> {
    let ytdlp_dir = ytdlp_dir()?;
    let binary_path = ytdlp_dir.join(binary_name());

    let already_installed = binary_path.exists();

    if !already_installed {
        info!("[yt-dlp] Not found, downloading...");
        download_and_extract(&ytdlp_dir, &binary_path).await?;
        info!("[yt-dlp] Installed to {:?}", binary_path);
    }

    let path_str = binary_path
        .to_str()
        .ok_or(YtDlpError::Other("Invalid path encoding".to_string()))?
        .to_string();
    
    crate::ytdlp::set_ytdlp_path(path_str);

    if already_installed {
        debug!("[yt-dlp] Already installed at {:?}", binary_path);
        check_for_update(&ytdlp_dir, &binary_path).await;
    } else {
        let tag = fetch_latest_release_tag().await.unwrap_or_else(|err| {
            debug!("[yt-dlp] Could not fetch release tag after install: {}", err);
            "unknown".to_string()
        });
        write_update_check(&ytdlp_dir, &UpdateCheck::now(tag));
    }

    Ok(already_installed)
}