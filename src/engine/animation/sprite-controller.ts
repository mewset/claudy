/**
 * Sprite Controller
 * Applies poses to the DOM via ClaudyAnimation
 */

import type { ClaudyPose } from "./types";
import { ClaudyAnimation, ClaudyState } from "../../claudy-css";

/**
 * Maps ClaudyPose to ClaudyState (they're currently identical,
 * but this abstraction allows them to diverge if needed)
 */
function poseToState(pose: ClaudyPose): ClaudyState {
  // Currently 1:1 mapping
  return pose as ClaudyState;
}

/**
 * Controls the Claudy sprite animation
 */
export class SpriteController {
  private animation: ClaudyAnimation | null = null;
  private currentPose: ClaudyPose = "idle";
  private onPoseChange?: (pose: ClaudyPose) => void;

  /**
   * Initialize the controller with a container element
   */
  init(container: HTMLElement, playIntro: boolean = true): void {
    this.animation = new ClaudyAnimation("/claudy-parts");
    this.animation.init(container, playIntro);

    // Forward internal state changes
    this.animation.setOnStateChange?.((state) => {
      this.currentPose = state as ClaudyPose;
      this.onPoseChange?.(this.currentPose);
    });
  }

  /**
   * Set the current pose
   */
  setPose(pose: ClaudyPose): void {
    if (!this.animation) {
      console.warn("[SpriteController] Not initialized");
      return;
    }

    this.currentPose = pose;
    const state = poseToState(pose);
    this.animation.setState(state);
    this.onPoseChange?.(pose);
  }

  /**
   * Get the current pose
   */
  getPose(): ClaudyPose {
    return this.currentPose;
  }

  /**
   * Set callback for pose changes
   */
  setOnPoseChange(callback: (pose: ClaudyPose) => void): void {
    this.onPoseChange = callback;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.animation?.destroy();
    this.animation = null;
  }
}
