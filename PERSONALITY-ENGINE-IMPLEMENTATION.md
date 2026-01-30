# Personality Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a personality engine to Claudy that makes it context-aware and able to comment on what's happening in the conversation.

**Architecture:** The personality engine wraps the existing `ClaudeEvent` system. It extracts message text from JSONL, analyzes keywords/sentiment, decides if/what to comment, and emits enhanced `PersonalityEvent`s that the frontend handles.

**Tech Stack:** Rust (backend), TypeScript (frontend), TOML (configuration files)

**Design Document:** See `PERSONALITY-ENGINE-DESIGN.md` for full rationale and decisions.

---

## Pre-requisites

Before starting, ensure you're in the correct worktree:

```bash
cd /home/m0s/Projekt/claudy/.worktrees/personality-engine
git branch  # Should show: * feature/personality-engine
```

Run these to verify the project builds:

```bash
npm run build
cargo build --manifest-path src-tauri/Cargo.toml
```

---

## Task 1: Create TOML Configuration Files

**Purpose:** Define keywords (EN+SV) and comment pools that the personality engine will use.

**Files:**
- Create: `src-tauri/personality/keywords.toml`
- Create: `src-tauri/personality/comments.toml`

### Step 1.1: Create personality directory

```bash
mkdir -p src-tauri/personality
```

### Step 1.2: Create keywords.toml

Create file `src-tauri/personality/keywords.toml`:

```toml
# Claudy Personality Engine - Keyword Detection
# Supports multiple languages. Claudy listens in all languages, responds in English.

[contexts.debugging]
keywords = [
  # English
  "error", "bug", "fix", "broken", "fail", "stacktrace", "exception", "crash", "issue", "problem",
  # Swedish
  "fel", "bugg", "fixa", "trasig", "krasch", "funkar inte", "fungerar inte", "problem"
]

[contexts.building]
keywords = [
  # English
  "create", "add", "implement", "build", "feature", "new", "make", "write",
  # Swedish
  "skapa", "lägg till", "implementera", "bygga", "funktion", "ny", "skriv"
]

[contexts.testing]
keywords = [
  # English
  "test", "spec", "assert", "coverage", "pass", "fail", "jest", "pytest", "cargo test",
  # Swedish
  "test", "täckning", "testerna"
]

[contexts.learning]
keywords = [
  # English
  "how", "why", "explain", "what is", "understand", "tell me", "help me understand",
  # Swedish
  "hur", "varför", "förklara", "vad är", "förstå", "berätta"
]

[contexts.refactoring]
keywords = [
  # English
  "refactor", "clean", "improve", "rename", "move", "restructure", "simplify",
  # Swedish
  "refaktorera", "städa", "förbättra", "döp om", "flytta", "förenkla"
]

[contexts.deploying]
keywords = [
  # English
  "deploy", "ship", "release", "production", "merge", "push", "publish",
  # Swedish
  "deploya", "releasa", "produktion", "mergea", "pusha"
]

# Sentiment detection patterns
[sentiment.frustrated]
keywords = [
  # English
  "damn", "shit", "fuck", "why", "stuck", "hate", "annoying", "frustrated",
  # Swedish
  "fan", "skit", "varför", "fast", "hatar", "irriterande", "frustrerad"
]
patterns = ["???", "?!", "!!!", "WTF", "WHAT"]

[sentiment.confused]
keywords = [
  # English
  "confused", "don't understand", "unclear", "lost", "what",
  # Swedish
  "förvirrad", "förstår inte", "oklart", "vilse"
]
patterns = ["??", "huh", "va?", "vadå"]

[sentiment.happy]
keywords = [
  # English
  "thanks", "nice", "perfect", "great", "awesome", "works", "excellent", "amazing",
  # Swedish
  "tack", "nice", "perfekt", "bra", "grymt", "funkar", "utmärkt", "fantastiskt"
]
patterns = ["!", ":)", "👍", "🎉"]
```

### Step 1.3: Create comments.toml

Create file `src-tauri/personality/comments.toml`:

```toml
# Claudy Personality Engine - Comment Pools
# All comments are in English. Claudy always responds in English.

# Context-specific comments (used when context is detected)
[comments.debugging]
pool = [
  "That bug again...",
  "We'll find it!",
  "Hmm, interesting error...",
  "Let's squash this one.",
  "Time to investigate.",
  "Following the trail..."
]

[comments.building]
pool = [
  "Creating something new!",
  "This is coming together.",
  "Nice addition!",
  "Building time!",
  "Let's make it happen.",
  "Fresh code incoming."
]

[comments.testing]
pool = [
  "Test time!",
  "Let's see if it holds up.",
  "Running the gauntlet...",
  "Fingers crossed!",
  "Moment of truth."
]

[comments.learning]
pool = [
  "Good question!",
  "Let me explain...",
  "Ah, interesting topic!",
  "Time to learn!",
  "Let's dive in."
]

[comments.refactoring]
pool = [
  "Cleaning up!",
  "Making it prettier.",
  "Tidying time.",
  "Simplifying...",
  "Polish mode engaged."
]

[comments.deploying]
pool = [
  "Ship it!",
  "To production we go!",
  "Release time!",
  "Let's get this out there.",
  "Deployment mode."
]

# Sentiment-response comments
[comments.frustrated_response]
pool = [
  "Tough one, huh?",
  "Take a breather?",
  "We've got this.",
  "One step at a time.",
  "Deep breath...",
  "Hang in there."
]

[comments.confused_response]
pool = [
  "Let's figure this out.",
  "I see the confusion.",
  "Step by step...",
  "Let me help clarify."
]

[comments.happy_response]
pool = [
  "Nice!",
  "That worked!",
  "Smooth sailing.",
  "On a roll!",
  "Great progress!"
]

# Milestone comments (always shown at these events)
[milestones.session_start]
pool = [
  "Hey! What are we building?",
  "Ready when you are!",
  "Let's do this.",
  "Good to see you!",
  "What's on the agenda?"
]

[milestones.first_error]
pool = [
  "Oops, something's off...",
  "First bump in the road.",
  "Let's see what went wrong.",
  "Hmm, that's not right."
]

[milestones.tests_pass]
pool = [
  "Green again!",
  "All tests passing!",
  "Back on track.",
  "Victory!",
  "Solid."
]

[milestones.session_end]
pool = [
  "Good session!",
  "Until next time!",
  "Nice work today.",
  "Catch you later!"
]

[milestones.idle]
pool = [
  "Still here if you need me.",
  "Taking a break?",
  "I'll be here.",
  "Just chilling..."
]

# Fallback comments (when nothing specific matches)
[fallback]
pool = [
  "Hmm...",
  "Interesting...",
  "Working on it...",
  "Let's see...",
  "Processing..."
]
```

### Step 1.4: Commit

```bash
git add src-tauri/personality/
git commit -m "feat: add personality engine TOML configuration files

- keywords.toml: Context detection keywords (EN + SV)
- comments.toml: Comment pools for all contexts and sentiments"
```

---

## Task 2: Create Rust Personality Module Structure

**Purpose:** Set up the Rust module structure for the personality engine.

**Files:**
- Create: `src-tauri/src/personality/mod.rs`
- Create: `src-tauri/src/personality/types.rs`
- Modify: `src-tauri/src/lib.rs` (add module)

### Step 2.1: Create personality directory

```bash
mkdir -p src-tauri/src/personality
```

### Step 2.2: Create types.rs

Create file `src-tauri/src/personality/types.rs`:

```rust
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
```

### Step 2.3: Create mod.rs

Create file `src-tauri/src/personality/mod.rs`:

```rust
//! Claudy Personality Engine
//!
//! Analyzes conversation content and decides when/what Claudy should comment.

pub mod types;

pub use types::*;

// Submodules to be added in subsequent tasks:
// pub mod config;    // Task 3: TOML loading
// pub mod analyzer;  // Task 4: Content analysis
// pub mod decider;   // Task 5: Comment trigger logic
// pub mod engine;    // Task 6: Main engine combining everything
```

### Step 2.4: Update lib.rs

Modify `src-tauri/src/lib.rs` to add the personality module:

```rust
// Claudy library - shared code between main app and CLI

pub mod config;
pub mod watcher;
pub mod state;
pub mod window;
pub mod personality;  // ADD THIS LINE
```

### Step 2.5: Verify it compiles

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

Expected: Build succeeds with possible warnings (unused code is fine at this stage).

### Step 2.6: Commit

```bash
git add src-tauri/src/personality/ src-tauri/src/lib.rs
git commit -m "feat: add personality engine module structure

- types.rs: Core type definitions (Context, Sentiment, PersonalityEvent)
- mod.rs: Module exports (submodules to be added)"
```

---

## Task 3: Implement TOML Config Loading

**Purpose:** Load keywords and comments from TOML files at runtime.

**Files:**
- Create: `src-tauri/src/personality/config.rs`
- Modify: `src-tauri/src/personality/mod.rs`
- Modify: `src-tauri/Cargo.toml` (may need toml dependency)

### Step 3.1: Check/add toml dependency

Check if `toml` is already in `src-tauri/Cargo.toml`. If not, add it:

```bash
grep -q "^toml " src-tauri/Cargo.toml || echo 'toml = "0.8"' >> src-tauri/Cargo.toml
```

Or manually add to `[dependencies]` section:
```toml
toml = "0.8"
```

### Step 3.2: Create config.rs

Create file `src-tauri/src/personality/config.rs`:

```rust
//! TOML configuration loading for personality engine.

use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;
use std::fs;

/// Root structure for keywords.toml
#[derive(Debug, Deserialize)]
pub struct KeywordsConfig {
    pub contexts: HashMap<String, ContextKeywords>,
    pub sentiment: HashMap<String, SentimentKeywords>,
}

#[derive(Debug, Deserialize)]
pub struct ContextKeywords {
    pub keywords: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct SentimentKeywords {
    pub keywords: Vec<String>,
    #[serde(default)]
    pub patterns: Vec<String>,
}

/// Root structure for comments.toml
#[derive(Debug, Deserialize)]
pub struct CommentsConfig {
    pub comments: HashMap<String, CommentPool>,
    pub milestones: HashMap<String, CommentPool>,
    pub fallback: CommentPool,
}

#[derive(Debug, Deserialize)]
pub struct CommentPool {
    pub pool: Vec<String>,
}

/// Combined personality configuration
#[derive(Debug)]
pub struct PersonalityConfig {
    pub keywords: KeywordsConfig,
    pub comments: CommentsConfig,
}

impl PersonalityConfig {
    /// Load configuration from the personality directory.
    /// Looks for files relative to the executable or in standard locations.
    pub fn load() -> Result<Self, ConfigError> {
        let base_path = Self::find_config_dir()?;

        let keywords_path = base_path.join("keywords.toml");
        let comments_path = base_path.join("comments.toml");

        let keywords_content = fs::read_to_string(&keywords_path)
            .map_err(|e| ConfigError::ReadError(keywords_path.clone(), e))?;
        let comments_content = fs::read_to_string(&comments_path)
            .map_err(|e| ConfigError::ReadError(comments_path.clone(), e))?;

        let keywords: KeywordsConfig = toml::from_str(&keywords_content)
            .map_err(|e| ConfigError::ParseError(keywords_path, e))?;
        let comments: CommentsConfig = toml::from_str(&comments_content)
            .map_err(|e| ConfigError::ParseError(comments_path, e))?;

        Ok(Self { keywords, comments })
    }

    /// Find the personality config directory.
    /// Checks multiple locations in order of preference.
    fn find_config_dir() -> Result<std::path::PathBuf, ConfigError> {
        // Try relative to current exe first (for packaged app)
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let personality_dir = exe_dir.join("personality");
                if personality_dir.exists() {
                    return Ok(personality_dir);
                }
                // Also check ../personality (for dev builds)
                let dev_dir = exe_dir.join("../personality");
                if dev_dir.exists() {
                    return Ok(dev_dir.canonicalize().unwrap_or(dev_dir));
                }
            }
        }

        // Try relative to crate root (for development)
        let crate_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        let dev_personality = crate_dir.join("personality");
        if dev_personality.exists() {
            return Ok(dev_personality);
        }

        Err(ConfigError::NotFound)
    }

    /// Get keywords for a specific context
    pub fn context_keywords(&self, context: &str) -> Option<&[String]> {
        self.keywords.contexts.get(context).map(|c| c.keywords.as_slice())
    }

    /// Get sentiment detection config
    pub fn sentiment_config(&self, sentiment: &str) -> Option<&SentimentKeywords> {
        self.keywords.sentiment.get(sentiment)
    }

    /// Get comment pool for a context
    pub fn context_comments(&self, context: &str) -> Option<&[String]> {
        self.comments.comments.get(context).map(|c| c.pool.as_slice())
    }

    /// Get milestone comments
    pub fn milestone_comments(&self, milestone: &str) -> Option<&[String]> {
        self.comments.milestones.get(milestone).map(|c| c.pool.as_slice())
    }

    /// Get fallback comments
    pub fn fallback_comments(&self) -> &[String] {
        &self.comments.fallback.pool
    }
}

#[derive(Debug)]
pub enum ConfigError {
    NotFound,
    ReadError(std::path::PathBuf, std::io::Error),
    ParseError(std::path::PathBuf, toml::de::Error),
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConfigError::NotFound => write!(f, "Personality config directory not found"),
            ConfigError::ReadError(path, e) => write!(f, "Failed to read {}: {}", path.display(), e),
            ConfigError::ParseError(path, e) => write!(f, "Failed to parse {}: {}", path.display(), e),
        }
    }
}

impl std::error::Error for ConfigError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_config() {
        // This will work if run from the src-tauri directory
        let config = PersonalityConfig::load();
        assert!(config.is_ok(), "Config should load: {:?}", config.err());

        let config = config.unwrap();

        // Check that some expected keys exist
        assert!(config.keywords.contexts.contains_key("debugging"));
        assert!(config.keywords.contexts.contains_key("building"));
        assert!(config.keywords.sentiment.contains_key("frustrated"));
        assert!(config.comments.comments.contains_key("debugging"));
        assert!(config.comments.milestones.contains_key("session_start"));
    }
}
```

### Step 3.3: Update mod.rs

Modify `src-tauri/src/personality/mod.rs`:

```rust
//! Claudy Personality Engine
//!
//! Analyzes conversation content and decides when/what Claudy should comment.

pub mod types;
pub mod config;  // ADD THIS LINE

pub use types::*;
pub use config::PersonalityConfig;  // ADD THIS LINE

// Submodules to be added in subsequent tasks:
// pub mod analyzer;  // Task 4: Content analysis
// pub mod decider;   // Task 5: Comment trigger logic
// pub mod engine;    // Task 6: Main engine combining everything
```

### Step 3.4: Run tests

```bash
cd src-tauri && cargo test personality::config::tests --manifest-path Cargo.toml -- --nocapture
```

Expected: Test passes, config loads successfully.

### Step 3.5: Verify build

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

### Step 3.6: Commit

```bash
git add src-tauri/src/personality/config.rs src-tauri/src/personality/mod.rs src-tauri/Cargo.toml
git commit -m "feat: add TOML config loading for personality engine

- config.rs: Load keywords.toml and comments.toml at runtime
- Supports multiple search paths (packaged app, dev builds)
- Includes unit test for config loading"
```

---

## Task 4: Implement Content Analyzer

**Purpose:** Extract context and sentiment from message text using keyword matching.

**Files:**
- Create: `src-tauri/src/personality/analyzer.rs`
- Modify: `src-tauri/src/personality/mod.rs`

### Step 4.1: Create analyzer.rs

Create file `src-tauri/src/personality/analyzer.rs`:

```rust
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
```

### Step 4.2: Update mod.rs

Modify `src-tauri/src/personality/mod.rs`:

```rust
//! Claudy Personality Engine
//!
//! Analyzes conversation content and decides when/what Claudy should comment.

pub mod types;
pub mod config;
pub mod analyzer;  // ADD THIS LINE

pub use types::*;
pub use config::PersonalityConfig;
pub use analyzer::Analyzer;  // ADD THIS LINE

// Submodules to be added in subsequent tasks:
// pub mod decider;   // Task 5: Comment trigger logic
// pub mod engine;    // Task 6: Main engine combining everything
```

### Step 4.3: Run tests

```bash
cd src-tauri && cargo test personality::analyzer::tests --manifest-path Cargo.toml -- --nocapture
```

Expected: All tests pass.

### Step 4.4: Commit

```bash
git add src-tauri/src/personality/analyzer.rs src-tauri/src/personality/mod.rs
git commit -m "feat: add content analyzer for personality engine

- Keyword-based context detection (debugging, building, etc.)
- Sentiment detection with keywords and patterns
- Supports both English and Swedish
- Unit tests for all detection logic"
```

---

## Task 5: Implement Comment Decider

**Purpose:** Decide when and what Claudy should comment based on triggers.

**Files:**
- Create: `src-tauri/src/personality/decider.rs`
- Modify: `src-tauri/src/personality/mod.rs`

### Step 5.1: Create decider.rs

Create file `src-tauri/src/personality/decider.rs`:

```rust
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
```

### Step 5.2: Add rand dependency

Check/add `rand` to `src-tauri/Cargo.toml`:

```bash
grep -q "^rand " src-tauri/Cargo.toml || echo 'rand = "0.8"' >> src-tauri/Cargo.toml
```

Or manually add to `[dependencies]`:
```toml
rand = "0.8"
```

### Step 5.3: Update mod.rs

Modify `src-tauri/src/personality/mod.rs`:

```rust
//! Claudy Personality Engine
//!
//! Analyzes conversation content and decides when/what Claudy should comment.

pub mod types;
pub mod config;
pub mod analyzer;
pub mod decider;  // ADD THIS LINE

pub use types::*;
pub use config::PersonalityConfig;
pub use analyzer::Analyzer;
pub use decider::Decider;  // ADD THIS LINE

// Submodules to be added in subsequent tasks:
// pub mod engine;    // Task 6: Main engine combining everything
```

### Step 5.4: Run tests

```bash
cd src-tauri && cargo test personality::decider::tests --manifest-path Cargo.toml -- --nocapture
```

Expected: All tests pass.

### Step 5.5: Commit

```bash
git add src-tauri/src/personality/decider.rs src-tauri/src/personality/mod.rs src-tauri/Cargo.toml
git commit -m "feat: add comment decider for personality engine

- Milestone detection (session start, first error, etc.)
- Emotional peak detection
- Random comment chance (2%)
- Comment selection from context-specific pools
- Session state tracking for stuck detection"
```

---

## Task 6: Implement Main Personality Engine

**Purpose:** Combine all components into a single engine that processes events.

**Files:**
- Create: `src-tauri/src/personality/engine.rs`
- Modify: `src-tauri/src/personality/mod.rs`

### Step 6.1: Create engine.rs

Create file `src-tauri/src/personality/engine.rs`:

```rust
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
        // Clone config for analyzer (or use Arc if we want to share)
        let analyzer_config = PersonalityConfig::load().unwrap(); // TODO: Better handling
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
```

### Step 6.2: Update mod.rs

Modify `src-tauri/src/personality/mod.rs`:

```rust
//! Claudy Personality Engine
//!
//! Analyzes conversation content and decides when/what Claudy should comment.

pub mod types;
pub mod config;
pub mod analyzer;
pub mod decider;
pub mod engine;  // ADD THIS LINE

pub use types::*;
pub use config::PersonalityConfig;
pub use analyzer::Analyzer;
pub use decider::Decider;
pub use engine::PersonalityEngine;  // ADD THIS LINE
```

### Step 6.3: Run all personality tests

```bash
cd src-tauri && cargo test personality --manifest-path Cargo.toml -- --nocapture
```

Expected: All tests pass.

### Step 6.4: Commit

```bash
git add src-tauri/src/personality/engine.rs src-tauri/src/personality/mod.rs
git commit -m "feat: add main personality engine

- Combines analyzer and decider into single interface
- process() method takes ClaudeEvent + optional text
- Returns PersonalityEvent with context, mood, and optional comment
- Unit tests for all main scenarios"
```

---

## Task 7: Extract Message Text from JSONL

**Purpose:** Update watcher.rs to extract actual message text from JSONL.

**Files:**
- Modify: `src-tauri/src/watcher.rs`

### Step 7.1: Update parse_jsonl_line function

The current `parse_jsonl_line` function only extracts event types. We need to also extract the message text.

Modify `src-tauri/src/watcher.rs`. Change the return type and extract text:

**Find the function signature (around line 142):**
```rust
fn parse_jsonl_line(line: &str, project: &str) -> Option<ClaudeEvent> {
```

**Replace the entire function with:**
```rust
/// Result of parsing a JSONL line
pub struct ParsedLine {
    pub event: ClaudeEvent,
    pub message_text: Option<String>,
}

fn parse_jsonl_line(line: &str, project: &str) -> Option<ParsedLine> {
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

    // Helper to extract text content from message
    let extract_text = |json: &serde_json::Value| -> Option<String> {
        let message = json.get("message")?;
        let content = message.get("content")?.as_array()?;

        // Collect all text content
        let texts: Vec<&str> = content.iter()
            .filter_map(|item| {
                if item.get("type")?.as_str()? == "text" {
                    item.get("text")?.as_str()
                } else {
                    None
                }
            })
            .collect();

        if texts.is_empty() {
            None
        } else {
            Some(texts.join("\n"))
        }
    };

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

                    // Extract user text
                    let text = content.iter()
                        .filter_map(|item| {
                            if item.get("type")?.as_str()? == "text" {
                                item.get("text")?.as_str().map(|s| s.to_string())
                            } else {
                                None
                            }
                        })
                        .collect::<Vec<_>>()
                        .join("\n");

                    return Some(ParsedLine {
                        event: ClaudeEvent::UserMessage {
                            project: project.to_string(),
                        },
                        message_text: if text.is_empty() { None } else { Some(text) },
                    });
                }
            }
            Some(ParsedLine {
                event: ClaudeEvent::UserMessage {
                    project: project.to_string(),
                },
                message_text: None,
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
                        let text = extract_text(&json);

                        match item_type {
                            Some("thinking") => {
                                return Some(ParsedLine {
                                    event: ClaudeEvent::Thinking {
                                        project: project.to_string(),
                                    },
                                    message_text: text,
                                });
                            }
                            Some("tool_use") => {
                                let tool_name = last_item
                                    .get("name")
                                    .and_then(|n| n.as_str())
                                    .unwrap_or("unknown")
                                    .to_string();
                                return Some(ParsedLine {
                                    event: ClaudeEvent::ToolUse {
                                        project: project.to_string(),
                                        tool: tool_name,
                                    },
                                    message_text: text,
                                });
                            }
                            Some("text") => {
                                return Some(ParsedLine {
                                    event: ClaudeEvent::Talking {
                                        project: project.to_string(),
                                    },
                                    message_text: text,
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
                        "SessionStart" => Some(ParsedLine {
                            event: ClaudeEvent::SessionStart {
                                project: project.to_string(),
                            },
                            message_text: None,
                        }),
                        "Stop" => Some(ParsedLine {
                            event: ClaudeEvent::Stop {
                                project: project.to_string(),
                                success: true,
                            },
                            message_text: None,
                        }),
                        _ => None,
                    }
                }
                "waiting_for_task" => Some(ParsedLine {
                    event: ClaudeEvent::WaitingForTask {
                        project: project.to_string(),
                    },
                    message_text: None,
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
                        return Some(ParsedLine {
                            event: ClaudeEvent::Error {
                                project: project.to_string(),
                                message: "Hook error".to_string(),
                            },
                            message_text: None,
                        });
                    }
                }
            }
            None
        }
        _ => None,
    }
}
```

### Step 7.2: Update parse_file_events to use new return type

**Find (around line 126-134):**
```rust
    // Read all new lines since last position
    for (i, line) in lines.iter().enumerate() {
        if i >= last_pos {
            if let Some(claude_event) = parse_jsonl_line(line, &project) {
                eprintln!("[Claudy] Parsed event: {:?}", claude_event);
                results.push(claude_event);
            }
        }
    }
```

**Replace with:**
```rust
    // Read all new lines since last position
    for (i, line) in lines.iter().enumerate() {
        if i >= last_pos {
            if let Some(parsed) = parse_jsonl_line(line, &project) {
                eprintln!("[Claudy] Parsed event: {:?}, text: {:?}",
                    parsed.event,
                    parsed.message_text.as_ref().map(|t| &t[..t.len().min(50)])
                );
                results.push(parsed);
            }
        }
    }
```

### Step 7.3: Update return type of parse_file_events

**Find (around line 85):**
```rust
fn parse_file_events(event: &Event, positions: &FilePositions) -> Vec<ClaudeEvent> {
```

**Replace with:**
```rust
fn parse_file_events(event: &Event, positions: &FilePositions) -> Vec<ParsedLine> {
```

### Step 7.4: Update the callback type in SessionWatcher::new

The callback now receives `ParsedLine` instead of `ClaudeEvent`. Update the type:

**Find (around line 29-32):**
```rust
    pub fn new<F>(callback: F) -> Result<Self, notify::Error>
    where
        F: Fn(ClaudeEvent) + Send + 'static,
```

**Replace with:**
```rust
    pub fn new<F>(callback: F) -> Result<Self, notify::Error>
    where
        F: Fn(ParsedLine) + Send + 'static,
```

**Find (around line 50-52):**
```rust
                for claude_event in events {
                    callback(claude_event);
                }
```

**Replace with:**
```rust
                for parsed in events {
                    callback(parsed);
                }
```

### Step 7.5: Verify it compiles

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

Note: This will likely cause errors in main.rs because it's using the old callback signature. We'll fix that in the next task.

### Step 7.6: Commit (even if main.rs doesn't compile yet)

```bash
git add src-tauri/src/watcher.rs
git commit -m "feat: extract message text from JSONL in watcher

- Add ParsedLine struct containing event + optional text
- Extract text content from user and assistant messages
- Update callback type to receive ParsedLine
- Enables personality engine to analyze message content"
```

---

## Task 8: Integrate Personality Engine into Main App

**Purpose:** Wire up the personality engine in main.rs and update state handling.

**Files:**
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/state.rs`

### Step 8.1: Update state.rs to handle PersonalityEvent

Modify `src-tauri/src/state.rs`:

```rust
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
    // NEW: Personality data
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
```

### Step 8.2: Update main.rs to use personality engine

Find the section in `src-tauri/src/main.rs` where the watcher callback is set up. It will look something like this:

```rust
// Set up watcher callback
let state_for_watcher = shared_state.clone();
let tx_for_watcher = tx.clone();
```

Update the callback to use the personality engine:

```rust
// Create personality engine
let personality_engine = Arc::new(Mutex::new(
    claudy_lib::personality::PersonalityEngine::new()
        .expect("Failed to load personality config")
));

// Set up watcher callback
let state_for_watcher = shared_state.clone();
let tx_for_watcher = tx.clone();
let engine_for_watcher = personality_engine.clone();

// In the callback:
move |parsed: claudy_lib::watcher::ParsedLine| {
    // Process through personality engine
    let personality_event = {
        let mut engine = engine_for_watcher.lock().unwrap();
        engine.process(parsed.event, parsed.message_text.as_deref())
    };

    eprintln!("[Claudy] Personality event: context={:?}, mood={:?}, comment={:?}",
        personality_event.context,
        personality_event.mood,
        personality_event.comment
    );

    // Update state
    {
        let mut state = state_for_watcher.lock().unwrap();
        state.handle_personality_event(personality_event);

        // Broadcast to WebSocket clients
        if let Some(ref tx) = *tx_for_watcher.lock().unwrap() {
            websocket::broadcast_state(tx, &state);
        }
    }

    // ... rest of callback (Tauri event emission, etc.)
}
```

**Note:** The exact changes depend on how main.rs is currently structured. Read the current main.rs carefully and adapt.

### Step 8.3: Verify it compiles and runs

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

### Step 8.4: Commit

```bash
git add src-tauri/src/main.rs src-tauri/src/state.rs
git commit -m "feat: integrate personality engine into main app

- Add context, mood, comment fields to ClaudyState
- Process events through PersonalityEngine in watcher callback
- State is now personality-aware and broadcasts enhanced data"
```

---

## Task 9: Update Frontend to Handle Personality Data

**Purpose:** Update the frontend to display context, mood, and comments from personality engine.

**Files:**
- Modify: `src/main.ts`

### Step 9.1: Update TypeScript types

Add these types near the top of `src/main.ts`:

```typescript
// Personality engine types
type Context = 'debugging' | 'building' | 'testing' | 'learning' | 'refactoring' | 'deploying';
type Mood = 'frustrated' | 'confused' | 'happy' | 'neutral';

interface PersonalityState {
  current_state: ClaudyState;
  active_projects: string[];
  focused_project: string | null;
  context: Context | null;
  mood: Mood | null;
  comment: string | null;
}
```

### Step 9.2: Update handleStateUpdate function

Modify the `handleStateUpdate` function to handle personality data:

```typescript
// Handle state update (shared between Tauri and WebSocket)
function handleStateUpdate(data: PersonalityState) {
  const state = data.current_state;
  console.log("[Claudy Frontend] Received state:", state, "context:", data.context, "mood:", data.mood);

  // Update CSS animation
  claudy.setState(state);

  // Update state label
  stateLabel.textContent = state;

  // Toggle matrix effect for working state
  setMatrixActive(state === 'working');

  // Update projects
  if (data.active_projects) {
    activeProjects = data.active_projects;
    renderProjectSwitcher();
  }

  // Priority: personality comment > state-specific message
  if (data.comment) {
    // Show comment from personality engine
    showBubble(data.comment);
  } else {
    // Fallback to existing state-specific messages
    const messages = stateMessages[state];
    if (messages) {
      showBubble(pickRandom(messages));
    }
  }

  // Future: Could use data.context and data.mood to adjust visuals
  // e.g., change colors, animation speed, etc.
}
```

### Step 9.3: Update WebSocket message handler

```typescript
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data) as PersonalityState;
    handleStateUpdate(data);
  } catch (e) {
    console.error("[Claudy WS] Failed to parse message:", e);
  }
};
```

### Step 9.4: Update Tauri event handler

```typescript
listen<PersonalityState>("claudy-state-change", async (event) => {
  handleStateUpdate(event.payload);
});
```

### Step 9.5: Test in browser

```bash
npm run dev
# Open http://localhost:1420 in browser
```

### Step 9.6: Commit

```bash
git add src/main.ts
git commit -m "feat: update frontend to display personality engine data

- Add TypeScript types for Context, Mood, PersonalityState
- Prioritize personality comments over hardcoded messages
- Maintain fallback to existing state messages
- Ready for future visual enhancements based on mood/context"
```

---

## Task 10: End-to-End Testing

**Purpose:** Verify the complete personality engine flow works.

### Step 10.1: Build everything

```bash
npm run build
cargo build --manifest-path src-tauri/Cargo.toml
```

### Step 10.2: Run the app

```bash
cargo tauri dev
```

### Step 10.3: Test scenarios

1. **Session Start:** Open a new Claude Code session → Claudy should comment
2. **Debugging Context:** Have Claude discuss an error → Should detect "debugging" context
3. **User Frustration:** Type "Why doesn't this work???" → Should detect frustrated sentiment
4. **Happy Path:** Complete a task successfully → Should detect happy sentiment

### Step 10.4: Check logs

Watch the terminal for personality engine debug output:
```
[Claudy] Personality event: context=Some(Debugging), mood=Some(Frustrated), comment=Some("Tough one, huh?")
```

### Step 10.5: Commit final state

```bash
git add -A
git commit -m "test: verify personality engine end-to-end integration

- All components working together
- Context detection verified
- Sentiment analysis verified
- Comments displaying correctly"
```

---

## Summary

After completing all tasks, the personality engine is fully integrated:

1. **TOML files** define keywords (EN+SV) and comment pools
2. **Analyzer** detects context and sentiment from message text
3. **Decider** determines when to comment (milestones, emotions, random)
4. **Engine** combines everything into a single process() call
5. **Watcher** extracts message text from JSONL
6. **State** carries personality data (context, mood, comment)
7. **Frontend** displays personality-driven comments

The system wraps existing functionality, so animations continue to work even if personality engine has issues.
