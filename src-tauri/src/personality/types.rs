//! Type definitions for the personality engine.

use serde::{Deserialize, Serialize};
use crate::watcher::ClaudeEvent;

/// Detected context of the conversation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Context {
    Debugging,
    Building,
    Testing,
    Learning,
    Refactoring,
    Deploying,
}

/// Detected sentiment/mood
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Sentiment {
    Frustrated,
    Confused,
    Happy,
    Neutral,
}

impl Default for Sentiment {
    fn default() -> Self {
        Sentiment::Neutral
    }
}

/// What triggered a potential comment
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Trigger {
    /// Milestone event (session start, first error, etc.)
    Milestone(MilestoneType),
    /// Emotional peak detected
    EmotionalPeak(Sentiment),
    /// Random chance triggered
    Random,
    /// No trigger
    None,
}

/// Types of milestone events
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MilestoneType {
    SessionStart,
    FirstError,
    TestsPass,
    SessionEnd,
    Idle,
}

/// Result of analyzing a message
#[derive(Debug, Clone, Default)]
pub struct AnalysisResult {
    pub context: Option<Context>,
    pub sentiment: Sentiment,
    pub message_text: Option<String>,
}

/// Enhanced event with personality data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalityEvent {
    /// The original Claude event (always present)
    #[serde(flatten)]
    pub base_event: ClaudeEvent,

    /// Detected context (if any)
    pub context: Option<Context>,

    /// Current mood based on sentiment
    pub mood: Option<Sentiment>,

    /// Comment to display (if triggered)
    pub comment: Option<String>,
}

impl PersonalityEvent {
    /// Create a new PersonalityEvent wrapping a ClaudeEvent
    pub fn new(base_event: ClaudeEvent) -> Self {
        Self {
            base_event,
            context: None,
            mood: None,
            comment: None,
        }
    }

    /// Add analysis results to the event
    pub fn with_analysis(mut self, analysis: AnalysisResult) -> Self {
        self.context = analysis.context;
        self.mood = Some(analysis.sentiment);
        self
    }

    /// Add a comment to the event
    pub fn with_comment(mut self, comment: String) -> Self {
        self.comment = Some(comment);
        self
    }
}
