/**
 * Personality Engine Types
 * Types for comment selection and personality system
 */

import type { ClaudyContext } from "../extraction/types";

/**
 * A single comment with priority for selection
 */
export interface Comment {
  text: string;
  priority: number;  // Higher = more specific, preferred over lower priority
}

/**
 * A category of comments with matching logic
 */
export interface CommentCategory {
  /** Name of this category for debugging */
  name: string;
  /** Function to determine if this category matches the context */
  match: (ctx: ClaudyContext) => boolean;
  /** Comments to choose from, or function to generate them dynamically */
  comments: Comment[] | ((ctx: ClaudyContext) => Comment[]);
}

/**
 * Result of comment selection
 */
export interface CommentSelection {
  text: string;
  category: string;
  priority: number;
}
