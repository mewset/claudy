use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    #[serde(default)]
    pub position: PositionConfig,
    #[serde(default)]
    pub appearance: AppearanceConfig,
    #[serde(default)]
    pub notifications: NotificationConfig,
    #[serde(default)]
    pub behavior: BehaviorConfig,
    #[serde(default)]
    pub projects: ProjectsConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PositionConfig {
    #[serde(default = "default_x")]
    pub x: i32,
    #[serde(default = "default_y")]
    pub y: i32,
    #[serde(default = "default_anchor")]
    pub anchor: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppearanceConfig {
    #[serde(default = "default_size")]
    pub size: String,
    #[serde(default = "default_theme")]
    pub theme: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationConfig {
    #[serde(default = "default_true")]
    pub sound: bool,
    #[serde(default = "default_true")]
    pub os_notifications: bool,
    #[serde(default = "default_bubble_duration")]
    pub bubble_duration: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BehaviorConfig {
    #[serde(default)]
    pub auto_start: bool,
    #[serde(default = "default_idle_timeout")]
    pub idle_timeout: u32,
    #[serde(default = "default_sleepy_timeout")]
    pub sleepy_timeout: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ProjectsConfig {
    #[serde(default)]
    pub registered: Vec<String>,
}

// Default functions
fn default_x() -> i32 {
    100
}
fn default_y() -> i32 {
    100
}
fn default_anchor() -> String {
    "bottom-right".to_string()
}
fn default_size() -> String {
    "medium".to_string()
}
fn default_theme() -> String {
    "auto".to_string()
}
fn default_true() -> bool {
    true
}
fn default_bubble_duration() -> u32 {
    5
}
fn default_idle_timeout() -> u32 {
    30
}
fn default_sleepy_timeout() -> u32 {
    300
}

impl Default for Config {
    fn default() -> Self {
        Self {
            position: PositionConfig::default(),
            appearance: AppearanceConfig::default(),
            notifications: NotificationConfig::default(),
            behavior: BehaviorConfig::default(),
            projects: ProjectsConfig::default(),
        }
    }
}

impl Default for PositionConfig {
    fn default() -> Self {
        Self {
            x: default_x(),
            y: default_y(),
            anchor: default_anchor(),
        }
    }
}

impl Default for AppearanceConfig {
    fn default() -> Self {
        Self {
            size: default_size(),
            theme: default_theme(),
        }
    }
}

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            sound: default_true(),
            os_notifications: default_true(),
            bubble_duration: default_bubble_duration(),
        }
    }
}

impl Default for BehaviorConfig {
    fn default() -> Self {
        Self {
            auto_start: false,
            idle_timeout: default_idle_timeout(),
            sleepy_timeout: default_sleepy_timeout(),
        }
    }
}

pub fn config_path() -> PathBuf {
    let dirs = directories::ProjectDirs::from("com", "claudy", "claudy")
        .expect("Could not determine config directory");
    dirs.config_dir().join("config.toml")
}

pub fn load_config() -> Config {
    let path = config_path();
    if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_default();
        toml::from_str(&content).unwrap_or_default()
    } else {
        Config::default()
    }
}

pub fn save_config(config: &Config) -> Result<(), Box<dyn std::error::Error>> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = toml::to_string_pretty(config)?;
    fs::write(path, content)?;
    Ok(())
}
