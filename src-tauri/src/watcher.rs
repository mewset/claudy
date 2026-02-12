use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub struct SessionWatcher {
    watcher: RecommendedWatcher,
    watched_projects: WatchedProjects,
    claude_projects_root: PathBuf,
    is_root_watched: bool,
    has_logged_missing_root: bool,
}

type WatchedProjects = Arc<Mutex<HashSet<String>>>;

#[derive(Default)]
struct FileReadState {
    offset: u64,
    pending: String,
}

type FileStates = Arc<Mutex<HashMap<PathBuf, FileReadState>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClaudeEvent {
    SessionStart {
        project: String,
    },
    UserMessage {
        project: String,
    },
    Thinking {
        project: String,
    },
    ToolUse {
        project: String,
        tool: String,
        file_path: Option<String>,
    },
    Talking {
        project: String,
    },
    WaitingForTask {
        project: String,
    },
    Stop {
        project: String,
        success: bool,
    },
    Error {
        project: String,
        message: String,
    },
}

impl SessionWatcher {
    pub fn new<F>(callback: F) -> Result<Self, notify::Error>
    where
        F: Fn(ClaudeEvent) + Send + 'static,
    {
        let (tx, rx) = channel();
        let file_states: FileStates = Arc::new(Mutex::new(HashMap::new()));
        let watched_projects: WatchedProjects = Arc::new(Mutex::new(HashSet::new()));

        let watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default().with_poll_interval(Duration::from_millis(500)),
        )?;

        // Spawn thread to process events
        let states = file_states.clone();
        let projects = watched_projects.clone();
        std::thread::spawn(move || {
            while let Ok(event) = rx.recv() {
                let events = parse_file_events(&event, &states, &projects);
                for claude_event in events {
                    callback(claude_event);
                }
            }
        });

        let claude_projects_root = dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("/"))
            .join(".claude")
            .join("projects");

        Ok(Self {
            watcher,
            watched_projects,
            claude_projects_root,
            is_root_watched: false,
            has_logged_missing_root: false,
        })
    }

    pub fn sync_projects(&mut self, project_paths: &[String]) -> Result<(), notify::Error> {
        let slugs: HashSet<String> = project_paths
            .iter()
            .map(|path| path_to_slug(Path::new(path)))
            .collect();

        {
            let mut watched = self.watched_projects.lock().unwrap();
            *watched = slugs;
        }

        if project_paths.is_empty() {
            return Ok(());
        }

        self.ensure_root_watch()?;

        Ok(())
    }

    fn ensure_root_watch(&mut self) -> Result<(), notify::Error> {
        if self.is_root_watched {
            return Ok(());
        }

        if !self.claude_projects_root.exists() {
            if !self.has_logged_missing_root {
                eprintln!(
                    "Claude project path doesn't exist yet: {}",
                    self.claude_projects_root.display()
                );
                self.has_logged_missing_root = true;
            }
            return Ok(());
        }

        self.watcher
            .watch(&self.claude_projects_root, RecursiveMode::Recursive)?;
        self.is_root_watched = true;
        println!("Watching: {}", self.claude_projects_root.display());

        Ok(())
    }
}

fn path_to_slug(path: &Path) -> String {
    path.to_string_lossy()
        .replace("/", "-")
        .replace(".", "")
        .to_string()
}

fn parse_file_events(
    event: &Event,
    file_states: &FileStates,
    watched_projects: &WatchedProjects,
) -> Vec<ClaudeEvent> {
    let mut results = Vec::new();

    // Only care about modify events
    if !event.kind.is_modify() {
        return results;
    }

    for path in &event.paths {
        results.extend(parse_jsonl_file(path, file_states, watched_projects));
    }

    results
}

fn parse_jsonl_file(
    path: &Path,
    file_states: &FileStates,
    watched_projects: &WatchedProjects,
) -> Vec<ClaudeEvent> {
    let mut results = Vec::new();

    if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
        return results;
    }

    // Ignore subagent JSONL files (they're in a subagents/ subdirectory)
    if path.to_string_lossy().contains("/subagents/") {
        return results;
    }

    // Extract project name from path
    let project = match path
        .parent()
        .and_then(|p| p.file_name().and_then(|n| n.to_str()))
    {
        Some(name) => name.to_string(),
        None => return results,
    };

    if !is_project_watched(&project, watched_projects) {
        return results;
    }

    let mut file = match File::open(path) {
        Ok(f) => f,
        Err(_) => return results,
    };

    let file_len = match file.metadata() {
        Ok(meta) => meta.len(),
        Err(_) => return results,
    };

    let (start_offset, pending_prefix) = {
        let mut states = file_states.lock().unwrap();
        let state = states.entry(path.to_path_buf()).or_default();

        // File got truncated/rotated
        if file_len < state.offset {
            state.offset = 0;
            state.pending.clear();
        }

        (state.offset, std::mem::take(&mut state.pending))
    };

    if file.seek(SeekFrom::Start(start_offset)).is_err() {
        return results;
    }

    let mut bytes = Vec::new();
    if file.read_to_end(&mut bytes).is_err() {
        return results;
    }

    let new_offset = start_offset + bytes.len() as u64;

    let mut buffer = pending_prefix;
    buffer.push_str(&String::from_utf8_lossy(&bytes));

    let (complete_lines, pending_tail) = split_complete_lines(buffer);

    for line in complete_lines {
        if line.is_empty() {
            continue;
        }

        if let Some(claude_event) = parse_jsonl_line(&line, &project) {
            eprintln!("[Claudy] Parsed event: {:?}", claude_event);
            results.push(claude_event);
        }
    }

    let mut states = file_states.lock().unwrap();
    let state = states.entry(path.to_path_buf()).or_default();
    state.offset = new_offset;
    state.pending = pending_tail;

    results
}

fn split_complete_lines(mut buffer: String) -> (Vec<String>, String) {
    if buffer.is_empty() {
        return (Vec::new(), String::new());
    }

    if buffer.ends_with('\n') {
        let lines = buffer
            .lines()
            .map(|line| line.trim_end_matches('\r').to_string())
            .collect();
        return (lines, String::new());
    }

    if let Some(last_newline) = buffer.rfind('\n') {
        let pending = buffer.split_off(last_newline + 1);
        let lines = buffer
            .lines()
            .map(|line| line.trim_end_matches('\r').to_string())
            .collect();
        return (lines, pending);
    }

    (Vec::new(), buffer)
}

fn is_project_watched(project: &str, watched_projects: &WatchedProjects) -> bool {
    watched_projects.lock().unwrap().contains(project)
}

fn parse_jsonl_line(line: &str, project: &str) -> Option<ClaudeEvent> {
    let json: serde_json::Value = serde_json::from_str(line).ok()?;

    let event_type = json.get("type")?.as_str()?;

    // Debug: log all assistant messages to see content structure
    if event_type == "assistant" {
        if let Some(message) = json.get("message") {
            if let Some(content) = message.get("content").and_then(|c| c.as_array()) {
                let types: Vec<&str> = content
                    .iter()
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

                                // Extract file_path from tool input
                                let file_path = last_item.get("input").and_then(|input| {
                                    // Try common field names for file paths
                                    input
                                        .get("file_path")
                                        .or_else(|| input.get("path"))
                                        .or_else(|| input.get("notebook_path"))
                                        .and_then(|v| v.as_str())
                                        .map(|s| s.to_string())
                                });

                                return Some(ClaudeEvent::ToolUse {
                                    project: project.to_string(),
                                    tool: tool_name,
                                    file_path,
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
