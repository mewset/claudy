//! Claudy Personality Engine
//!
//! Analyzes conversation content and decides when/what Claudy should comment.

pub mod types;
pub mod config;
pub mod analyzer;

pub use types::*;
pub use config::PersonalityConfig;
pub use analyzer::Analyzer;

// Submodules to be added in subsequent tasks:
// pub mod decider;   // Task 5: Comment trigger logic
// pub mod engine;    // Task 6: Main engine combining everything
