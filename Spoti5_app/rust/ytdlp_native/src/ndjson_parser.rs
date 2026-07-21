//! NDJSON parser for yt-dlp output
//! 
//! This module provides utilities for parsing Newline Delimited JSON (NDJSON)
//! output from yt-dlp.

use serde_json::Value;

/// Parse NDJSON output into a vector of JSON values
/// 
/// # Arguments
/// * `input` - NDJSON string (one JSON object per line)
/// 
/// # Returns
/// Vector of parsed JSON values, skipping malformed lines
pub fn parse_ndjson(input: &str) -> Vec<Value> {
    input
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| {
            serde_json::from_str(line).ok()
        })
        .collect()
}

/// Parse NDJSON output and extract specific fields
/// 
/// # Arguments
/// * `input` - NDJSON string
/// * `field` - Field name to extract
/// 
/// # Returns
/// Vector of extracted field values
pub fn extract_field(input: &str, field: &str) -> Vec<Option<Value>> {
    parse_ndjson(input)
        .iter()
        .map(|entry| entry.get(field).cloned())
        .collect()
}

/// Parse NDJSON output and filter by condition
/// 
/// # Arguments
/// * `input` - NDJSON string
/// * `predicate` - Function to filter entries
/// 
/// # Returns
/// Vector of filtered JSON values
pub fn filter_entries<F>(input: &str, predicate: F) -> Vec<Value>
where
    F: Fn(&Value) -> bool,
{
    parse_ndjson(input)
        .into_iter()
        .filter(|entry| predicate(entry))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ndjson_valid() {
        let input = r#"{"id":"1","title":"Song 1"}
{"id":"2","title":"Song 2"}"#;
        
        let result = parse_ndjson(input);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0]["id"], "1");
        assert_eq!(result[1]["id"], "2");
    }

    #[test]
    fn test_parse_ndjson_with_empty_lines() {
        let input = r#"{"id":"1","title":"Song 1"}

{"id":"2","title":"Song 2"}

"#;
        
        let result = parse_ndjson(input);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_parse_ndjson_malformed_lines() {
        let input = r#"{"id":"1","title":"Song 1"}
not json
{"id":"2","title":"Song 2"}"#;
        
        let result = parse_ndjson(input);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_parse_ndjson_empty_input() {
        let input = "";
        let result = parse_ndjson(input);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_extract_field() {
        let input = r#"{"id":"1","title":"Song 1"}
{"id":"2","title":"Song 2"}"#;
        
        let ids = extract_field(input, "id");
        assert_eq!(ids.len(), 2);
        assert_eq!(ids[0], Some(Value::String("1".to_string())));
        assert_eq!(ids[1], Some(Value::String("2".to_string())));
    }

    #[test]
    fn test_filter_entries() {
        let input = r#"{"id":"1","title":"Song 1","duration":120}
{"id":"2","title":"Song 2","duration":180}
{"id":"3","title":"Song 3","duration":null}"#;
        
        let with_duration = filter_entries(input, |entry| {
            entry.get("duration").map_or(false, |v| !v.is_null())
        });
        
        assert_eq!(with_duration.len(), 2);
    }
}