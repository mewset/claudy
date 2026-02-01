//! Content analyzer for extracting context and sentiment from messages.

use crate::personality::{
    config::PersonalityConfig,
    types::{AnalysisResult, Context, Sentiment},
};

/// Analyzes message content for context and sentiment
pub struct Analyzer {
    config: PersonalityConfig,
}

impl Analyzer {
    /// Create a new analyzer with the given configuration
    pub fn new(config: PersonalityConfig) -> Self {
        Self { config }
    }

    /// Analyze a message and return context/sentiment
    pub fn analyze(&self, text: &str) -> AnalysisResult {
        let text_lower = text.to_lowercase();

        let context = self.detect_context(&text_lower);
        let sentiment = self.detect_sentiment(text, &text_lower);

        AnalysisResult {
            context,
            sentiment,
            message_text: Some(text.to_string()),
        }
    }

    /// Detect the conversation context from keywords
    fn detect_context(&self, text_lower: &str) -> Option<Context> {
        // Check each context in priority order
        let context_checks = [
            ("debugging", Context::Debugging),
            ("testing", Context::Testing),
            ("deploying", Context::Deploying),
            ("refactoring", Context::Refactoring),
            ("building", Context::Building),
            ("learning", Context::Learning),
        ];

        for (key, context) in context_checks {
            if let Some(keywords) = self.config.context_keywords(key) {
                if self.matches_any(text_lower, keywords) {
                    return Some(context);
                }
            }
        }

        None
    }

    /// Detect sentiment from text patterns and keywords
    fn detect_sentiment(&self, original: &str, text_lower: &str) -> Sentiment {
        // Check frustrated first (highest priority for empathy)
        if let Some(cfg) = self.config.sentiment_config("frustrated") {
            if self.matches_any(text_lower, &cfg.keywords) {
                return Sentiment::Frustrated;
            }
            // Check patterns (case-sensitive for things like "WTF", "???" etc)
            for pattern in &cfg.patterns {
                if original.contains(pattern) {
                    return Sentiment::Frustrated;
                }
            }
        }

        // Check confused
        if let Some(cfg) = self.config.sentiment_config("confused") {
            if self.matches_any(text_lower, &cfg.keywords) {
                return Sentiment::Confused;
            }
            for pattern in &cfg.patterns {
                if original.contains(pattern) {
                    return Sentiment::Confused;
                }
            }
        }

        // Check happy
        if let Some(cfg) = self.config.sentiment_config("happy") {
            if self.matches_any(text_lower, &cfg.keywords) {
                return Sentiment::Happy;
            }
            for pattern in &cfg.patterns {
                if original.contains(pattern) {
                    return Sentiment::Happy;
                }
            }
        }

        Sentiment::Neutral
    }

    /// Check if text contains any of the keywords
    fn matches_any(&self, text: &str, keywords: &[String]) -> bool {
        keywords.iter().any(|kw| text.contains(&kw.to_lowercase()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_analyzer() -> Analyzer {
        let config = PersonalityConfig::load().expect("Config should load");
        Analyzer::new(config)
    }

    #[test]
    fn test_detect_debugging_context() {
        let analyzer = test_analyzer();

        let result = analyzer.analyze("I have an error in my code");
        assert_eq!(result.context, Some(Context::Debugging));

        let result = analyzer.analyze("Det är ett fel i koden");
        assert_eq!(result.context, Some(Context::Debugging));
    }

    #[test]
    fn test_detect_building_context() {
        let analyzer = test_analyzer();

        let result = analyzer.analyze("Let's create a new feature");
        assert_eq!(result.context, Some(Context::Building));

        let result = analyzer.analyze("Kan du implementera detta?");
        assert_eq!(result.context, Some(Context::Building));
    }

    #[test]
    fn test_detect_frustrated_sentiment() {
        let analyzer = test_analyzer();

        let result = analyzer.analyze("Why doesn't this work???");
        assert_eq!(result.sentiment, Sentiment::Frustrated);

        let result = analyzer.analyze("Fan, det fungerar inte!");
        assert_eq!(result.sentiment, Sentiment::Frustrated);
    }

    #[test]
    fn test_detect_happy_sentiment() {
        let analyzer = test_analyzer();

        let result = analyzer.analyze("Thanks, that works perfectly!");
        assert_eq!(result.sentiment, Sentiment::Happy);

        let result = analyzer.analyze("Tack, det funkar!");
        assert_eq!(result.sentiment, Sentiment::Happy);
    }

    #[test]
    fn test_neutral_sentiment() {
        let analyzer = test_analyzer();

        let result = analyzer.analyze("Please update the variable name");
        assert_eq!(result.sentiment, Sentiment::Neutral);
    }
}
