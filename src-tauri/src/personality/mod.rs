//! Claudy Personality Engine
//!
//! Analyzes conversation content and decides when/what Claudy should comment.

pub mod types;
pub mod config;
pub mod analyzer;
pub mod decider;
pub mod engine;

pub use types::*;
pub use config::PersonalityConfig;
pub use analyzer::Analyzer;
pub use decider::Decider;
pub use engine::PersonalityEngine;
