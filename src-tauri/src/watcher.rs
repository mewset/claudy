use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event};
use std::path::Path;
use std::sync::mpsc::channel;
use std::time::Duration;
use serde::{Deserialize, Serialize};

pub struct SessionWatcher {
    _watcher: RecommendedWatcher,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClaudeEvent {
    SessionStart { project: String },
    UserMessage { project: String },
    AssistantWorking { project: String },
    ToolUse { project: String, tool: String },
    Stop { project: String, success: bool },
    Error { project: String, message: String },
}

impl SessionWatcher {
    pub fn new<F>(callback: F) -> Result<Self, notify::Error>
    where
        F: Fn(ClaudeEvent) + Send + 'static,
    {
        let (tx, rx) = channel();

        let watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default().with_poll_interval(Duration::from_millis(500)),
        )?;

        // Spawn thread to process events
        std::thread::spawn(move || {
            while let Ok(event) = rx.recv() {
                if let Some(claude_event) = parse_file_event(&event) {
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
        .to_string()
}

fn parse_file_event(event: &Event) -> Option<ClaudeEvent> {
    // Only care about modify events on .jsonl files
    if !event.kind.is_modify() {
        return None;
    }

    let path = event.paths.first()?;
    if path.extension()?.to_str()? != "jsonl" {
        return None;
    }

    // Extract project name from path
    let project = path
        .parent()?
        .file_name()?
        .to_string_lossy()
        .to_string();

    // Read last line of file to determine event type
    let content = std::fs::read_to_string(path).ok()?;
    let last_line = content.lines().last()?;

    parse_jsonl_line(last_line, &project)
}

fn parse_jsonl_line(line: &str, project: &str) -> Option<ClaudeEvent> {
    let json: serde_json::Value = serde_json::from_str(line).ok()?;

    let event_type = json.get("type")?.as_str()?;

    match event_type {
        "user" => Some(ClaudeEvent::UserMessage {
            project: project.to_string(),
        }),
        "assistant" => Some(ClaudeEvent::AssistantWorking {
            project: project.to_string(),
        }),
        "progress" => {
            let data = json.get("data")?;
            let progress_type = data.get("type")?.as_str()?;

            if progress_type == "hook_progress" {
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
            } else {
                None
            }
        }
        _ => None,
    }
}
