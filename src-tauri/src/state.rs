use std::sync::{Arc, Mutex};
use crate::watcher::ClaudeEvent;
use crate::personality::{PersonalityEvent, Context, Sentiment};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ClaudyState {
    pub current_state: String,
    pub active_projects: Vec<String>,
    pub focused_project: Option<String>,
    pub last_event: Option<ClaudeEvent>,
    // Personality data
    pub context: Option<Context>,
    pub mood: Option<Sentiment>,
    pub comment: Option<String>,
}

impl ClaudyState {
    pub fn new() -> Self {
        Self {
            current_state: "idle".to_string(),
            active_projects: vec![],
            focused_project: None,
            last_event: None,
            context: None,
            mood: None,
            comment: None,
        }
    }

    /// Handle a personality-enhanced event
    pub fn handle_personality_event(&mut self, event: PersonalityEvent) {
        // Update personality fields
        self.context = event.context;
        self.mood = event.mood;
        self.comment = event.comment;

        // Call existing event handler for base event
        self.handle_event(event.base_event);
    }

    pub fn handle_event(&mut self, event: ClaudeEvent) {
        self.last_event = Some(event.clone());

        // Helper to ensure project is tracked
        let track_project = |projects: &mut Vec<String>, focused: &mut Option<String>, project: &String| {
            if !projects.contains(project) {
                projects.push(project.clone());
            }
            if focused.is_none() {
                *focused = Some(project.clone());
            }
        };

        match &event {
            ClaudeEvent::SessionStart { project } => {
                track_project(&mut self.active_projects, &mut self.focused_project, project);
                self.current_state = "wake".to_string();
            }
            ClaudeEvent::UserMessage { project } => {
                track_project(&mut self.active_projects, &mut self.focused_project, project);
                self.current_state = "listening".to_string();
            }
            ClaudeEvent::Thinking { project } => {
                track_project(&mut self.active_projects, &mut self.focused_project, project);
                self.current_state = "thinking".to_string();
            }
            ClaudeEvent::ToolUse { project, .. } => {
                track_project(&mut self.active_projects, &mut self.focused_project, project);
                self.current_state = "working".to_string();
            }
            ClaudeEvent::Talking { project } => {
                track_project(&mut self.active_projects, &mut self.focused_project, project);
                self.current_state = "talking".to_string();
            }
            ClaudeEvent::WaitingForTask { project } => {
                track_project(&mut self.active_projects, &mut self.focused_project, project);
                self.current_state = "sleepy".to_string();
            }
            ClaudeEvent::Stop { project, success } => {
                track_project(&mut self.active_projects, &mut self.focused_project, project);
                self.current_state = if *success { "happy" } else { "confused" }.to_string();
            }
            ClaudeEvent::Error { .. } => {
                self.current_state = "confused".to_string();
            }
        }
    }
}

pub type SharedState = Arc<Mutex<ClaudyState>>;
