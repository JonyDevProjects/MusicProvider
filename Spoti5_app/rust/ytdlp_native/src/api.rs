//! Public API for Flutter Rust Bridge

use crate::ytdlp;
use crate::ytdlp_setup;
use crate::{PlaylistInfo, SearchResult, StreamInfo, YtDlpError, YtDlpResult};

/// Search for tracks using yt-dlp
pub async fn search(query: String, limit: u32) -> Result<Vec<SearchResult>, String> {
    ytdlp::search(&query, limit)
        .await
        .map_err(|e| e.to_string())
}

/// Get stream information for a video
pub async fn get_stream_info(video_id: String) -> Result<StreamInfo, String> {
    ytdlp::get_stream_info(&video_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get playlist information
pub async fn get_playlist(url: String) -> Result<PlaylistInfo, String> {
    ytdlp::get_playlist(&url)
        .await
        .map_err(|e| e.to_string())
}

/// Ensure yt-dlp is installed and up to date
pub async fn ensure_installed() -> Result<bool, String> {
    ytdlp_setup::ensure_installed()
        .await
        .map_err(|e| e.to_string())
}

/// Get yt-dlp version
pub async fn get_version() -> Result<String, String> {
    ytdlp::get_version()
        .await
        .map_err(|e| e.to_string())
}