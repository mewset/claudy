/**
 * Comment Categories Index
 * Exports all comment categories for the personality engine
 */

import type { CommentCategory } from "../types";
import { debuggingCategories } from "./debugging";
import { toolsCategories } from "./tools";
import { sessionCategories } from "./session";
import { clippyCategories } from "./clippy";

/**
 * All comment categories, ordered by general priority
 * (more specific categories should come first)
 */
export const allCategories: CommentCategory[] = [
  // Clippy-style special moments (highest priority)
  ...clippyCategories,
  // Debugging patterns (high priority when matched)
  ...debuggingCategories,
  // Session-based comments
  ...sessionCategories,
  // Tool-specific comments (lower priority)
  ...toolsCategories,
];

// Re-export individual category groups for testing/customization
export { debuggingCategories } from "./debugging";
export { toolsCategories } from "./tools";
export { sessionCategories } from "./session";
export { clippyCategories } from "./clippy";
