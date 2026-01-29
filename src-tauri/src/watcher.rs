use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::time::Duration;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

pub struct SessionWatcher {
    _watcher: RecommendedWatcher,
}

// Track last read line for each file
type FilePositions = Arc<Mutex<HashMap<PathBuf, usize>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClaudeEvent {
    SessionStart { project: String },
    UserMessage { project: String },
    Thinking { project: String },
    ToolUse { project: String, tool: String },
    Talking { project: String },
    WaitingForTask { project: String },
    Stop { project: String, success: bool },
    Error { project: String, message: String },
}

impl SessionWatcher {
    pub fn new<F>(callback: F) -> Result<Self, notify::Error>
    where
        F: Fn(ClaudeEvent) + Send + 'static,
    {
        let (tx, rx) = channel();
        let file_positions: FilePositions = Arc::new(Mutex::new(HashMap::new()));

        let watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default().with_poll_interval(Duration::from_millis(500)),
        )?;

        // Spawn thread to process events
        let positions = file_positions.clone();
        std::thread::spawn(move || {
            while let Ok(event) = rx.recv() {
                // Process all new lines, not just the last one
                let events = parse_file_events(&event, &positions);
                for claude_event in events {
                    callback(claude_event);
                }
            }
        });

        Ok(Self { _watcher: watcher })
    }

    pub fn watch_project(&mut self, path: &Path) -> Result<(), notify::Error> {
        // Watch the .claude/projects directory for this project
        let claude_path = dirs::home_dir()
            .unwrap()
            .join(".claude")
            .join("projects")
            .join(path_to_slug(path));

        if claude_path.exists() {
            self._watcher.watch(&claude_path, RecursiveMode::Recursive)?;
            println!("Watching: {}", claude_path.display());
        } else {
            println!("Claude project path doesn't exist yet: {}", claude_path.display());
        }
        Ok(())
    }
}

fn path_to_slug(path: &Path) -> String {
    path.to_string_lossy()
        .replace("/", "-")
        .replace(".", "")
        .to_string()
}

fn parse_file_events(event: &Event, positions: &FilePositions) -> Vec<ClaudeEvent> {
    let mut results = Vec::new();

    // Only care about modify events on .jsonl files
    if !event.kind.is_modify() {
        return results;
    }

    let path = match event.paths.first() {
        Some(p) => p,
        None => return results,
    };

    if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
        return results;
    }

    // Ignore subagent JSONL files (they're in a subagents/ subdirectory)
    if path.to_string_lossy().contains("/subagents/") {
        return results;
    }

    // Extract project name from path
    let project = match path.parent().and_then(|p| p.file_name()) {
        Some(name) => name.to_string_lossy().to_string(),
        None => return results,
    };

    // Read file content
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return results,
    };

    let lines: Vec<&str> = content.lines().collect();
    let total_lines = lines.len();

    // Get last read position for this file
    let mut pos_guard = positions.lock().unwrap();
    let last_pos = pos_guard.get(path).copied().unwrap_or(0);

    // Read all new lines since last position
    for (i, line) in lines.iter().enumerate() {
        if i >= last_pos {
            if let Some(claude_event) = parse_jsonl_line(line, &project) {
                eprintln!("[Claudy] Parsed event: {:?}", claude_event);
                results.push(claude_event);
            }
        }
    }

    // Update position
    pos_guard.insert(path.to_path_buf(), total_lines);

    results
}

fn parse_jsonl_line(line: &str, project: &str) -> Option<ClaudeEvent> {
    let json: serde_json::Value = serde_json::from_str(line).ok()?;

    let event_type = json.get("type")?.as_str()?;

    // Debug: log all assistant messages to see content structure
    if event_type == "assistant" {
        if let Some(message) = json.get("message") {
            if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                let types: Vec<&str> = content.iter()
                    .filter_map(|item| item.get("type").and_then(|t| t.as_str()))
                    .collect();
                eprintln!("[Claudy] Assistant content types: {:?}", types);
            }
        }
    }

    match event_type {
        "user" => {
            // Check if this is a real user message or just a tool_result
            if let Some(message) = json.get("message") {
                if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                    // If content contains tool_result, ignore it (not a real user message)
                    for item in content {
                        if item.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                            return None;
                        }
                    }
                }
            }
            Some(ClaudeEvent::UserMessage {
                project: project.to_string(),
            })
        }
        "assistant" => {
            // Check the LAST content item to determine current activity
            // Order in content is usually: thinking -> tool_use -> text
            if let Some(message) = json.get("message") {
                if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                    // Get the last item in content array
                    if let Some(last_item) = content.last() {
                        let item_type = last_item.get("type").and_then(|t| t.as_str());

                        match item_type {
                            Some("thinking") => {
                                return Some(ClaudeEvent::Thinking {
                                    project: project.to_string(),
                                });
                            }
                            Some("tool_use") => {
                                let tool_name = last_item
                                    .get("name")
                                    .and_then(|n| n.as_str())
                                    .unwrap_or("unknown")
                                    .to_string();
                                return Some(ClaudeEvent::ToolUse {
                                    project: project.to_string(),
                                    tool: tool_name,
                                });
                            }
                            Some("text") => {
                                return Some(ClaudeEvent::Talking {
                                    project: project.to_string(),
                                });
                            }
                            _ => {}
                        }
                    }
                }
            }
            None
        }
        "progress" => {
            let data = json.get("data")?;
            let progress_type = data.get("type")?.as_str()?;

            match progress_type {
                "hook_progress" => {
                    let hook_event = data.get("hookEvent")?.as_str()?;
                    match hook_event {
                        "SessionStart" => Some(ClaudeEvent::SessionStart {
                            project: project.to_string(),
                        }),
                        "Stop" => Some(ClaudeEvent::Stop {
                            project: project.to_string(),
                            success: true,
                        }),
                        _ => None,
                    }
                }
                "waiting_for_task" => Some(ClaudeEvent::WaitingForTask {
                    project: project.to_string(),
                }),
                _ => None,
            }
        }
        "system" => {
            // Check for hook errors in stop_hook_summary
            let subtype = json.get("subtype")?.as_str()?;
            if subtype == "stop_hook_summary" {
                if let Some(errors) = json.get("hookErrors").and_then(|e| e.as_array()) {
                    if !errors.is_empty() {
                        return Some(ClaudeEvent::Error {
                            project: project.to_string(),
                            message: "Hook error".to_string(),
                        });
                    }
                }
            }
            None
        }
        _ => None,
    }
}
