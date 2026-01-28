use std::sync::{Arc, Mutex};
use crate::watcher::ClaudeEvent;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ClaudyState {
    pub current_state: String,
    pub active_projects: Vec<String>,
    pub focused_project: Option<String>,
    pub last_event: Option<ClaudeEvent>,
}

impl ClaudyState {
    pub fn new() -> Self {
        Self {
            current_state: "idle".to_string(),
            active_projects: vec![],
            focused_project: None,
            last_event: None,
        }
    }

    pub fn handle_event(&mut self, event: ClaudeEvent) {
        self.last_event = Some(event.clone());

        match &event {
            ClaudeEvent::SessionStart { project } => {
                if !self.active_projects.contains(project) {
                    self.active_projects.push(project.clone());
                }
                if self.focused_project.is_none() {
                    self.focused_project = Some(project.clone());
                }
                self.current_state = "wake".to_string();
            }
            ClaudeEvent::UserMessage { project } => {
                if !self.active_projects.contains(project) {
                    self.active_projects.push(project.clone());
                }
                if self.focused_project.is_none() {
                    self.focused_project = Some(project.clone());
                }
                self.current_state = "listening".to_string();
            }
            ClaudeEvent::AssistantWorking { project } => {
                if !self.active_projects.contains(project) {
                    self.active_projects.push(project.clone());
                }
                if self.focused_project.is_none() {
                    self.focused_project = Some(project.clone());
                }
                self.current_state = "thinking".to_string();
            }
            ClaudeEvent::ToolUse { project, .. } => {
                if !self.active_projects.contains(project) {
                    self.active_projects.push(project.clone());
                }
                if self.focused_project.is_none() {
                    self.focused_project = Some(project.clone());
                }
                self.current_state = "working".to_string();
            }
            ClaudeEvent::Stop { project, success } => {
                // Make sure project is in active list (in case we missed earlier events)
                if !self.active_projects.contains(project) {
                    self.active_projects.push(project.clone());
                }
                if self.focused_project.is_none() {
                    self.focused_project = Some(project.clone());
                }
                self.current_state = if *success { "happy" } else { "confused" }.to_string();
                // Note: Don't remove project on Stop - keep it visible
                // User can see which project completed the task
            }
            ClaudeEvent::Error { .. } => {
                self.current_state = "confused".to_string();
            }
        }
    }
}

pub type SharedState = Arc<Mutex<ClaudyState>>;
