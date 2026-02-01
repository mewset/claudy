//! Comment trigger logic and comment selection.

use rand::Rng;
use crate::personality::{
    config::PersonalityConfig,
    types::{AnalysisResult, Context, MilestoneType, Sentiment, Trigger},
};
use crate::watcher::ClaudeEvent;

/// Tracks session state for milestone detection
#[derive(Debug, Default)]
pub struct SessionState {
    /// Whether we've seen an error this session
    pub seen_error: bool,
    /// Whether we've seen tests pass after failure
    pub tests_failed: bool,
    /// Number of consecutive same errors (for stuck detection)
    pub error_count: u32,
    /// Last error message (for stuck detection)
    pub last_error: Option<String>,
}

/// Decides when and what to comment
pub struct Decider {
    config: PersonalityConfig,
    session_state: SessionState,
}

impl Decider {
    /// Create a new decider with the given configuration
    pub fn new(config: PersonalityConfig) -> Self {
        Self {
            config,
            session_state: SessionState::default(),
        }
    }

    /// Determine the trigger type for this event/analysis combination
    pub fn determine_trigger(
        &mut self,
        event: &ClaudeEvent,
        analysis: &AnalysisResult,
    ) -> Trigger {
        // Check milestones first (highest priority)
        if let Some(milestone) = self.check_milestone(event) {
            return Trigger::Milestone(milestone);
        }

        // Check emotional peaks
        if self.is_emotional_peak(analysis) {
            return Trigger::EmotionalPeak(analysis.sentiment);
        }

        // Random chance (2%)
        if rand::thread_rng().gen_ratio(2, 100) {
            return Trigger::Random;
        }

        Trigger::None
    }

    /// Check if this event is a milestone
    fn check_milestone(&mut self, event: &ClaudeEvent) -> Option<MilestoneType> {
        match event {
            ClaudeEvent::SessionStart { .. } => {
                // Reset session state
                self.session_state = SessionState::default();
                Some(MilestoneType::SessionStart)
            }
            ClaudeEvent::Error { message, .. } => {
                if !self.session_state.seen_error {
                    self.session_state.seen_error = true;
                    Some(MilestoneType::FirstError)
                } else {
                    // Track for stuck detection
                    if self.session_state.last_error.as_ref() == Some(message) {
                        self.session_state.error_count += 1;
                    } else {
                        self.session_state.error_count = 1;
                        self.session_state.last_error = Some(message.clone());
                    }
                    None
                }
            }
            ClaudeEvent::Stop { success, .. } => {
                if *success {
                    Some(MilestoneType::SessionEnd)
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    /// Check if this is an emotional peak worth commenting on
    fn is_emotional_peak(&self, analysis: &AnalysisResult) -> bool {
        match analysis.sentiment {
            Sentiment::Frustrated => true,
            Sentiment::Confused => true,
            Sentiment::Happy => true,
            Sentiment::Neutral => false,
        }
    }

    /// Should we actually comment based on the trigger?
    /// Returns true based on probability for each trigger type.
    pub fn should_comment(&self, trigger: &Trigger) -> bool {
        match trigger {
            Trigger::Milestone(_) => true,  // 100%
            Trigger::EmotionalPeak(_) => rand::thread_rng().gen_ratio(80, 100),  // 80%
            Trigger::Random => true,  // Already rolled, so 100% if we got here
            Trigger::None => false,
        }
    }

    /// Select a comment based on trigger and analysis
    pub fn select_comment(
        &self,
        trigger: &Trigger,
        analysis: &AnalysisResult,
    ) -> Option<String> {
        let pool = match trigger {
            Trigger::Milestone(milestone) => {
                let key = match milestone {
                    MilestoneType::SessionStart => "session_start",
                    MilestoneType::FirstError => "first_error",
                    MilestoneType::TestsPass => "tests_pass",
                    MilestoneType::SessionEnd => "session_end",
                    MilestoneType::Idle => "idle",
                };
                self.config.milestone_comments(key)
            }
            Trigger::EmotionalPeak(sentiment) => {
                let key = match sentiment {
                    Sentiment::Frustrated => "frustrated_response",
                    Sentiment::Confused => "confused_response",
                    Sentiment::Happy => "happy_response",
                    Sentiment::Neutral => return None,
                };
                self.config.context_comments(key)
            }
            Trigger::Random => {
                // For random comments, use context if available, else fallback
                if let Some(context) = analysis.context {
                    let key = match context {
                        Context::Debugging => "debugging",
                        Context::Building => "building",
                        Context::Testing => "testing",
                        Context::Learning => "learning",
                        Context::Refactoring => "refactoring",
                        Context::Deploying => "deploying",
                    };
                    self.config.context_comments(key)
                } else {
                    Some(self.config.fallback_comments())
                }
            }
            Trigger::None => None,
        };

        pool.and_then(|p| self.pick_random(p))
    }

    /// Pick a random item from a slice
    fn pick_random(&self, items: &[String]) -> Option<String> {
        if items.is_empty() {
            None
        } else {
            let idx = rand::thread_rng().gen_range(0..items.len());
            Some(items[idx].clone())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_decider() -> Decider {
        let config = PersonalityConfig::load().expect("Config should load");
        Decider::new(config)
    }

    #[test]
    fn test_session_start_milestone() {
        let mut decider = test_decider();
        let event = ClaudeEvent::SessionStart { project: "test".to_string() };
        let analysis = AnalysisResult::default();

        let trigger = decider.determine_trigger(&event, &analysis);
        assert!(matches!(trigger, Trigger::Milestone(MilestoneType::SessionStart)));
    }

    #[test]
    fn test_first_error_milestone() {
        let mut decider = test_decider();
        let event = ClaudeEvent::Error {
            project: "test".to_string(),
            message: "Test error".to_string()
        };
        let analysis = AnalysisResult::default();

        // First error should be milestone
        let trigger = decider.determine_trigger(&event, &analysis);
        assert!(matches!(trigger, Trigger::Milestone(MilestoneType::FirstError)));

        // Second error should not be milestone
        let trigger = decider.determine_trigger(&event, &analysis);
        assert!(!matches!(trigger, Trigger::Milestone(_)));
    }

    #[test]
    fn test_emotional_peak_trigger() {
        let mut decider = test_decider();
        let event = ClaudeEvent::Talking { project: "test".to_string() };
        let analysis = AnalysisResult {
            context: None,
            sentiment: Sentiment::Frustrated,
            message_text: Some("Why doesn't this work???".to_string()),
        };

        let trigger = decider.determine_trigger(&event, &analysis);
        assert!(matches!(trigger, Trigger::EmotionalPeak(Sentiment::Frustrated)));
    }

    #[test]
    fn test_select_milestone_comment() {
        let decider = test_decider();
        let trigger = Trigger::Milestone(MilestoneType::SessionStart);
        let analysis = AnalysisResult::default();

        let comment = decider.select_comment(&trigger, &analysis);
        assert!(comment.is_some());
        println!("Selected comment: {:?}", comment);
    }
}
