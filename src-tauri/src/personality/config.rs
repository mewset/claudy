//! TOML configuration loading for personality engine.

use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;
use std::fs;

/// Root structure for keywords.toml
#[derive(Debug, Deserialize)]
pub struct KeywordsConfig {
    pub contexts: HashMap<String, ContextKeywords>,
    pub sentiment: HashMap<String, SentimentKeywords>,
}

#[derive(Debug, Deserialize)]
pub struct ContextKeywords {
    pub keywords: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct SentimentKeywords {
    pub keywords: Vec<String>,
    #[serde(default)]
    pub patterns: Vec<String>,
}

/// Root structure for comments.toml
#[derive(Debug, Deserialize)]
pub struct CommentsConfig {
    pub comments: HashMap<String, CommentPool>,
    pub milestones: HashMap<String, CommentPool>,
    pub fallback: CommentPool,
}

#[derive(Debug, Deserialize)]
pub struct CommentPool {
    pub pool: Vec<String>,
}

/// Combined personality configuration
#[derive(Debug)]
pub struct PersonalityConfig {
    pub keywords: KeywordsConfig,
    pub comments: CommentsConfig,
}

impl PersonalityConfig {
    /// Load configuration from the personality directory.
    /// Looks for files relative to the executable or in standard locations.
    pub fn load() -> Result<Self, ConfigError> {
        let base_path = Self::find_config_dir()?;

        let keywords_path = base_path.join("keywords.toml");
        let comments_path = base_path.join("comments.toml");

        let keywords_content = fs::read_to_string(&keywords_path)
            .map_err(|e| ConfigError::ReadError(keywords_path.clone(), e))?;
        let comments_content = fs::read_to_string(&comments_path)
            .map_err(|e| ConfigError::ReadError(comments_path.clone(), e))?;

        let keywords: KeywordsConfig = toml::from_str(&keywords_content)
            .map_err(|e| ConfigError::ParseError(keywords_path, e))?;
        let comments: CommentsConfig = toml::from_str(&comments_content)
            .map_err(|e| ConfigError::ParseError(comments_path, e))?;

        Ok(Self { keywords, comments })
    }

    /// Find the personality config directory.
    /// Checks multiple locations in order of preference.
    fn find_config_dir() -> Result<std::path::PathBuf, ConfigError> {
        // Try relative to current exe first (for packaged app)
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let personality_dir = exe_dir.join("personality");
                if personality_dir.exists() {
                    return Ok(personality_dir);
                }
                // Also check ../personality (for dev builds)
                let dev_dir = exe_dir.join("../personality");
                if dev_dir.exists() {
                    return Ok(dev_dir.canonicalize().unwrap_or(dev_dir));
                }
            }
        }

        // Try relative to crate root (for development)
        let crate_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        let dev_personality = crate_dir.join("personality");
        if dev_personality.exists() {
            return Ok(dev_personality);
        }

        Err(ConfigError::NotFound)
    }

    /// Get keywords for a specific context
    pub fn context_keywords(&self, context: &str) -> Option<&[String]> {
        self.keywords.contexts.get(context).map(|c| c.keywords.as_slice())
    }

    /// Get sentiment detection config
    pub fn sentiment_config(&self, sentiment: &str) -> Option<&SentimentKeywords> {
        self.keywords.sentiment.get(sentiment)
    }

    /// Get comment pool for a context
    pub fn context_comments(&self, context: &str) -> Option<&[String]> {
        self.comments.comments.get(context).map(|c| c.pool.as_slice())
    }

    /// Get milestone comments
    pub fn milestone_comments(&self, milestone: &str) -> Option<&[String]> {
        self.comments.milestones.get(milestone).map(|c| c.pool.as_slice())
    }

    /// Get fallback comments
    pub fn fallback_comments(&self) -> &[String] {
        &self.comments.fallback.pool
    }
}

#[derive(Debug)]
pub enum ConfigError {
    NotFound,
    ReadError(std::path::PathBuf, std::io::Error),
    ParseError(std::path::PathBuf, toml::de::Error),
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConfigError::NotFound => write!(f, "Personality config directory not found"),
            ConfigError::ReadError(path, e) => write!(f, "Failed to read {}: {}", path.display(), e),
            ConfigError::ParseError(path, e) => write!(f, "Failed to parse {}: {}", path.display(), e),
        }
    }
}

impl std::error::Error for ConfigError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_config() {
        // This will work if run from the src-tauri directory
        let config = PersonalityConfig::load();
        assert!(config.is_ok(), "Config should load: {:?}", config.err());

        let config = config.unwrap();

        // Check that some expected keys exist
        assert!(config.keywords.contexts.contains_key("debugging"));
        assert!(config.keywords.contexts.contains_key("building"));
        assert!(config.keywords.sentiment.contains_key("frustrated"));
        assert!(config.comments.comments.contains_key("debugging"));
        assert!(config.comments.milestones.contains_key("session_start"));
    }
}
