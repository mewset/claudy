/**
 * Animation Engine
 * Selects appropriate pose based on context
 */

import type { ClaudyContext } from "../extraction/types";
import type { ClaudyPose, AnimationEngineConfig } from "./types";

const DEFAULT_CONFIG: AnimationEngineConfig = {
  longSessionThreshold: 7200, // 2 hours in seconds
  errorThreshold: 3,
  struggleThreshold: 3,
};

/**
 * Maps Claude events to Claudy poses with smart selection
 */
export class AnimationEngine {
  private config: AnimationEngineConfig;
  private lastPose: ClaudyPose = "idle";
  private hadRecentStruggle: boolean = false;

  constructor(config: Partial<AnimationEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Select the appropriate pose based on context
   */
  selectPose(ctx: ClaudyContext): ClaudyPose {
    // Track struggle state for "extra happy" on success
    if (ctx.recentErrors >= this.config.struggleThreshold) {
      this.hadRecentStruggle = true;
    }

    const pose = this.determinePose(ctx);
    this.lastPose = pose;
    return pose;
  }

  /**
   * Core pose selection logic
   */
  private determinePose(ctx: ClaudyContext): ClaudyPose {
    // Session start always shows intro
    if (ctx.event === "session_start") {
      this.hadRecentStruggle = false;
      return "intro";
    }

    // Error states
    if (ctx.result === "error" || ctx.event === "error") {
      return "confused";
    }

    // Multiple recent errors → stay confused
    if (ctx.recentErrors >= this.config.errorThreshold) {
      return "confused";
    }

    // Success after struggle → extra happy
    if (ctx.result === "success" && this.hadRecentStruggle) {
      this.hadRecentStruggle = false;
      return "happy";
    }

    // Long session → sometimes sleepy
    if (ctx.sessionDuration > this.config.longSessionThreshold) {
      // 20% chance of sleepy during idle-like states
      if (ctx.event === "waiting" && Math.random() < 0.2) {
        return "sleepy";
      }
    }

    // Map events to poses
    switch (ctx.event) {
      case "user_message":
        return "listening";

      case "thinking":
        return "thinking";

      case "tool_use":
      case "tool_result":
        return "working";

      case "talking":
        return "talking";

      case "stop":
        // Completion → happy
        return "happy";

      case "waiting":
        // Check if we should wake up from idle
        if (this.lastPose === "idle" || this.lastPose === "sleepy") {
          return "wake";
        }
        return "idle";

      default:
        return "idle";
    }
  }

  /**
   * Get the current/last pose
   */
  getCurrentPose(): ClaudyPose {
    return this.lastPose;
  }

  /**
   * Reset engine state (e.g., on session change)
   */
  reset(): void {
    this.lastPose = "idle";
    this.hadRecentStruggle = false;
  }
}
