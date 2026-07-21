//! Native yt-dlp wrapper for Flutter via flutter_rust_bridge
//! 
//! This library provides a native interface to yt-dlp for searching,
//! extracting metadata, and getting stream URLs from various platforms.

mod frb_generated; /* AUTO INJECTED BY flutter_rust_bridge. This line may not be accurate, and you can change it according to your needs. */

mod ytdlp;
mod ytdlp_setup;
mod ndjson_parser;
pub mod api;

pub use ytdlp::*;
pub use ytdlp_setup::*;
pub use ndjson_parser::*;

/// Result type for yt-dlp operations
pub type YtDlpResult<T> = Result<T, YtDlpError>;

/// Error types for yt-dlp operations
#[derive(Debug, thiserror::Error)]
pub enum YtDlpError {
    #[error("yt-dlp binary not found: {0}")]
    BinaryNotFound(String),
    
    #[error("yt-dlp execution failed: {0}")]
    ExecutionFailed(String),
    
    #[error("Failed to parse yt-dlp output: {0}")]
    ParseError(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
    
    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),
    
    #[error("Zip error: {0}")]
    ZipError(#[from] zip::result::ZipError),
    
    #[error("Other error: {0}")]
    Other(String),
}

/// Search result from yt-dlp
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
    pub channel: Option<String>,
}

/// Stream information from yt-dlp
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StreamInfo {
    pub stream_url: String,
    pub duration: Option<f64>,
    pub title: Option<String>,
    pub container: Option<String>,
    pub codec: Option<String>,
}

/// Playlist entry from yt-dlp
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlaylistEntry {
    pub id: String,
    pub title: String,
    pub duration: Option<f64>,
    pub thumbnails: Vec<Thumbnail>,
    pub channel: Option<String>,
}

/// Thumbnail information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Thumbnail {
    pub url: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

/// Playlist information from yt-dlp
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlaylistInfo {
    pub id: String,
    pub title: String,
    pub entries: Vec<PlaylistEntry>,
}

/// Search for tracks using yt-dlp
/// 
/// # Arguments
/// * `query` - Search query string
/// * `limit` - Maximum number of results (default: 10)
/// 
/// # Returns
/// Vector of search results
pub async fn search(query: &str, limit: Option<u32>) -> YtDlpResult<Vec<SearchResult>> {
    let limit = limit.unwrap_or(10);
    ytdlp::search(query, limit).await
}

/// Get stream information for a video
/// 
/// # Arguments
/// * `video_id` - YouTube video ID or URL
/// 
/// # Returns
/// Stream information including the direct stream URL
pub async fn get_stream_info(video_id: &str) -> YtDlpResult<StreamInfo> {
    ytdlp::get_stream_info(video_id).await
}

/// Get playlist information
/// 
/// # Arguments
/// * `url` - Playlist URL
/// 
/// # Returns
/// Playlist information including all entries
pub async fn get_playlist(url: &str) -> YtDlpResult<PlaylistInfo> {
    ytdlp::get_playlist(url).await
}

/// Ensure yt-dlp is installed and up to date
/// 
/// # Returns
/// true if already installed, false if newly installed
pub async fn ensure_installed() -> YtDlpResult<bool> {
    ytdlp_setup::ensure_installed().await
}

/// Get the current yt-dlp version
/// 
/// # Returns
/// Version string or error
pub async fn get_version() -> YtDlpResult<String> {
    ytdlp::get_version().await
}