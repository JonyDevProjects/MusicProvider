//! yt-dlp wrapper implementation
//! 
//! This module provides the core functionality for interacting with yt-dlp,
//! including search, stream info extraction, and playlist parsing.

use crate::{YtDlpError, YtDlpResult, SearchResult, StreamInfo, PlaylistInfo, PlaylistEntry, Thumbnail};
use crate::ndjson_parser;
use crate::ytdlp_setup;
use log::{debug, error, info};
use std::process::{Command, Stdio};
use std::sync::RwLock;

/// Global path to yt-dlp binary
static YTDLP_PATH: RwLock<Option<String>> = RwLock::new(None);

/// Set the path to yt-dlp binary
pub fn set_ytdlp_path(path: String) {
    if let Ok(mut guard) = YTDLP_PATH.write() {
        debug!("[yt-dlp] Binary path set to: {}", path);
        *guard = Some(path);
    }
}

/// Get the path to yt-dlp binary
fn get_ytdlp_path() -> YtDlpResult<String> {
    match YTDLP_PATH.read() {
        Ok(guard) => match guard.as_ref() {
            Some(path) => Ok(path.clone()),
            None => {
                Err(YtDlpError::BinaryNotFound(
                    "yt-dlp is not installed. Call ensure_installed() first.".to_string()
                ))
            }
        },
        Err(_) => {
            debug!("[yt-dlp] RwLock poisoned, falling back to system PATH");
            Ok("yt-dlp".to_string())
        }
    }
}

/// Run yt-dlp with given arguments
fn run_ytdlp(args: &[&str]) -> YtDlpResult<String> {
    let program = get_ytdlp_path()?;
    let mut cmd = Command::new(&program);
    cmd.args(args).stdout(Stdio::piped()).stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().map_err(|error| {
        error!("[yt-dlp] Failed to execute: {}", error);
        YtDlpError::ExecutionFailed(format!("Failed to execute yt-dlp: {}. Is yt-dlp installed?", error))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("[yt-dlp] Command failed: {}", stderr);
        return Err(YtDlpError::ExecutionFailed(format!("yt-dlp failed: {}", stderr)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// Parse NDJSON output from yt-dlp
fn parse_ndjson_entries(stdout: &str) -> Vec<serde_json::Value> {
    stdout
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect()
}

/// Search for tracks using yt-dlp
pub async fn search(query: &str, limit: u32) -> YtDlpResult<Vec<SearchResult>> {
    debug!("[yt-dlp] Searching: {} (limit: {})", query, limit);

    let search_url = format!("ytsearch{}:{}", limit, query);
    let stdout = run_ytdlp(&[
        "--dump-json",
        "--flat-playlist",
        "--no-warnings",
        &search_url,
    ])?;

    let entries = parse_ndjson_entries(&stdout);
    let mut results = Vec::new();

    for entry in entries {
        if let Some(id) = entry.get("id").and_then(|v| v.as_str()) {
            let title = entry.get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();
            
            let duration = entry.get("duration")
                .and_then(|v| v.as_f64());
            
            let thumbnail = entry.get("thumbnail")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .or_else(|| {
                    entry.get("thumbnails")
                        .and_then(|v| v.as_array())
                        .and_then(|arr| arr.last())
                        .and_then(|t| t.get("url"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                });
            
            let channel = entry.get("channel")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            results.push(SearchResult {
                id: id.to_string(),
                title,
                duration,
                thumbnail,
                channel,
            });
        }
    }

    debug!("[yt-dlp] Found {} results", results.len());
    Ok(results)
}

/// Get stream information for a video
pub async fn get_stream_info(video_id: &str) -> YtDlpResult<StreamInfo> {
    debug!("[yt-dlp] Getting stream for: {}", video_id);

    let url = if video_id.starts_with("http") {
        video_id.to_string()
    } else {
        format!("https://www.youtube.com/watch?v={}", video_id)
    };

    let stdout = run_ytdlp(&[
        "-f",
        "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
        "--dump-json",
        "--no-playlist",
        "--no-warnings",
        &url,
    ])?;

    let info: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|error| {
            error!("[yt-dlp] Failed to parse output: {}", error);
            YtDlpError::ParseError(format!("Failed to parse yt-dlp output: {}", error))
        })?;

    let stream_url = info.get("url")
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            error!("[yt-dlp] No URL in output");
            YtDlpError::ParseError("No stream URL returned by yt-dlp".to_string())
        })?
        .to_string();

    let title = info.get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let duration = info.get("duration")
        .and_then(|v| v.as_f64());

    let container = info.get("ext")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let codec = info.get("acodec")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    debug!(
        "[yt-dlp] Got stream for '{}', duration: {:?}s",
        title.as_deref().unwrap_or("Unknown"),
        duration
    );

    Ok(StreamInfo {
        stream_url,
        duration,
        title,
        container,
        codec,
    })
}

/// Get playlist information
pub async fn get_playlist(url: &str) -> YtDlpResult<PlaylistInfo> {
    debug!("[yt-dlp] Getting playlist: {}", url);

    let stdout = run_ytdlp(&["--dump-json", "--flat-playlist", "--no-warnings", url])?;
    let entries = parse_ndjson_entries(&stdout);

    let playlist_title = entries
        .iter()
        .find_map(|entry| entry.get("playlist_title").and_then(|v| v.as_str()))
        .ok_or_else(|| {
            error!("[yt-dlp] No playlist metadata found in output");
            YtDlpError::ParseError("No playlist metadata found in yt-dlp output".to_string())
        })?
        .to_string();

    let playlist_id = entries
        .iter()
        .find_map(|entry| entry.get("playlist_id").and_then(|v| v.as_str()))
        .unwrap_or_default()
        .to_string();

    let mut playlist_entries = Vec::new();
    for entry in entries {
        if let Some(id) = entry.get("id").and_then(|v| v.as_str()) {
            let title = entry.get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();
            
            let duration = entry.get("duration")
                .and_then(|v| v.as_f64());
            
            let thumbnails = entry.get("thumbnails")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|t| {
                            let url = t.get("url")?.as_str()?.to_string();
                            let width = t.get("width").and_then(|v| v.as_u64()).map(|v| v as u32);
                            let height = t.get("height").and_then(|v| v.as_u64()).map(|v| v as u32);
                            Some(Thumbnail { url, width, height })
                        })
                        .collect()
                })
                .unwrap_or_default();
            
            let channel = entry.get("channel")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            playlist_entries.push(PlaylistEntry {
                id: id.to_string(),
                title,
                duration,
                thumbnails,
                channel,
            });
        }
    }

    debug!(
        "[yt-dlp] Playlist '{}' has {} entries",
        playlist_title,
        playlist_entries.len()
    );

    Ok(PlaylistInfo {
        id: playlist_id,
        title: playlist_title,
        entries: playlist_entries,
    })
}

/// Get yt-dlp version
pub async fn get_version() -> YtDlpResult<String> {
    let stdout = run_ytdlp(&["--version"])?;
    Ok(stdout.trim().to_string())
}