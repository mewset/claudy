//! Main personality engine that combines all components.

use crate::personality::{
    analyzer::Analyzer,
    config::PersonalityConfig,
    decider::Decider,
    types::{AnalysisResult, PersonalityEvent},
};
use crate::watcher::ClaudeEvent;

/// The main personality engine
pub struct PersonalityEngine {
    analyzer: Analyzer,
    decider: Decider,
}

impl PersonalityEngine {
    /// Create a new personality engine, loading config from default location
    pub fn new() -> Result<Self, crate::personality::config::ConfigError> {
        let config = PersonalityConfig::load()?;
        Ok(Self::with_config(config))
    }

    /// Create a personality engine with explicit config (useful for testing)
    pub fn with_config(config: PersonalityConfig) -> Self {
        // Load a second config for the analyzer since PersonalityConfig doesn't implement Clone
        // TODO: Consider using Arc<PersonalityConfig> to share config between components
        let analyzer_config = PersonalityConfig::load().unwrap();
        let analyzer = Analyzer::new(analyzer_config);
        let decider = Decider::new(config);

        Self { analyzer, decider }
    }

    /// Process a ClaudeEvent and return an enhanced PersonalityEvent
    pub fn process(&mut self, event: ClaudeEvent, message_text: Option<&str>) -> PersonalityEvent {
        // Analyze message if provided
        let analysis = message_text
            .map(|text| self.analyzer.analyze(text))
            .unwrap_or_default();

        // Determine if we should comment
        let trigger = self.decider.determine_trigger(&event, &analysis);

        // Build the personality event
        let mut personality_event = PersonalityEvent::new(event)
            .with_analysis(analysis.clone());

        // Add comment if triggered and probability check passes
        if self.decider.should_comment(&trigger) {
            if let Some(comment) = self.decider.select_comment(&trigger, &analysis) {
                personality_event = personality_event.with_comment(comment);
            }
        }

        personality_event
    }
}

impl Default for PersonalityEngine {
    fn default() -> Self {
        Self::new().expect("Failed to load personality config")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_creation() {
        let engine = PersonalityEngine::new();
        assert!(engine.is_ok(), "Engine should create successfully");
    }

    #[test]
    fn test_process_session_start() {
        let mut engine = PersonalityEngine::new().unwrap();
        let event = ClaudeEvent::SessionStart { project: "test".to_string() };

        let result = engine.process(event, None);

        // Session start should always have a comment
        assert!(result.comment.is_some(), "Session start should have comment");
        println!("Comment: {:?}", result.comment);
    }

    #[test]
    fn test_process_with_context() {
        let mut engine = PersonalityEngine::new().unwrap();
        let event = ClaudeEvent::Talking { project: "test".to_string() };

        let result = engine.process(event, Some("I found an error in the code"));

        assert_eq!(result.context, Some(crate::personality::Context::Debugging));
        println!("Context: {:?}, Comment: {:?}", result.context, result.comment);
    }

    #[test]
    fn test_process_with_sentiment() {
        let mut engine = PersonalityEngine::new().unwrap();
        let event = ClaudeEvent::UserMessage { project: "test".to_string() };

        let result = engine.process(event, Some("Why doesn't this work???"));

        assert_eq!(result.mood, Some(crate::personality::Sentiment::Frustrated));
        println!("Mood: {:?}, Comment: {:?}", result.mood, result.comment);
    }
}
