/**
 * Animation Engine Types
 * Types for Claudy pose selection and sprite control
 */

export type ClaudyPose =
  | "intro"
  | "idle"
  | "wake"
  | "listening"
  | "thinking"
  | "working"
  | "talking"
  | "happy"
  | "confused"
  | "sleepy";

/**
 * Pose metadata for animation decisions
 */
export interface PoseConfig {
  pose: ClaudyPose;
  isOneShot: boolean;
  fallbackPose: ClaudyPose;
}

/**
 * Animation engine configuration
 */
export interface AnimationEngineConfig {
  longSessionThreshold: number;  // seconds before considering "long session"
  errorThreshold: number;        // errors before showing confused
  struggleThreshold: number;     // attempts before "struggle" is detected
}
