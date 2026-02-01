//! Claudy Personality Engine
//!
//! Analyzes conversation content and decides when/what Claudy should comment.

pub mod types;
pub mod config;

pub use types::*;
pub use config::PersonalityConfig;

// Submodules to be added in subsequent tasks:
// pub mod analyzer;  // Task 4: Content analysis
// pub mod decider;   // Task 5: Comment trigger logic
// pub mod engine;    // Task 6: Main engine combining everything
