/**
 * Personality Engine
 * Selects appropriate comments based on context
 */

import type { ClaudyContext } from "../extraction/types";
import type { Comment, CommentCategory, CommentSelection } from "./types";
import { allCategories } from "./categories";

/**
 * Configuration for the personality engine
 */
export interface PersonalityEngineConfig {
  /** Chance of showing a comment (0-1) */
  commentChance: number;
  /** Categories to use (default: all) */
  categories?: CommentCategory[];
  /** Minimum priority to show */
  minPriority?: number;
}

const DEFAULT_CONFIG: PersonalityEngineConfig = {
  commentChance: 0.7, // 70% chance to show a comment
  minPriority: 0,
};

/**
 * Selects contextual comments for Claudy's speech bubble
 */
export class PersonalityEngine {
  private config: PersonalityEngineConfig;
  private categories: CommentCategory[];
  private lastComment: string | null = null;
  private recentComments: Set<string> = new Set();

  constructor(config: Partial<PersonalityEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.categories = this.config.categories || allCategories;
  }

  /**
   * Select a comment based on the current context
   * Returns null if no comment should be shown
   */
  selectComment(ctx: ClaudyContext): string | null {
    // Random chance to skip comment (reduces noise)
    if (Math.random() > this.config.commentChance) {
      return null;
    }

    const selection = this.findBestComment(ctx);
    if (!selection) {
      return null;
    }

    // Avoid repeating the same comment too often
    if (this.recentComments.has(selection.text)) {
      // Try to find an alternative
      const alternative = this.findAlternativeComment(ctx, selection.text);
      if (alternative) {
        this.recordComment(alternative.text);
        return alternative.text;
      }
    }

    this.recordComment(selection.text);
    return selection.text;
  }

  /**
   * Find the best matching comment
   */
  private findBestComment(ctx: ClaudyContext): CommentSelection | null {
    const matches: CommentSelection[] = [];

    for (const category of this.categories) {
      if (!category.match(ctx)) continue;

      const comments = this.resolveComments(category, ctx);
      for (const comment of comments) {
        if (comment.priority >= (this.config.minPriority || 0)) {
          matches.push({
            text: comment.text,
            category: category.name,
            priority: comment.priority,
          });
        }
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Find highest priority
    const maxPriority = Math.max(...matches.map((m) => m.priority));
    const topMatches = matches.filter((m) => m.priority === maxPriority);

    // Random selection among top priority
    return topMatches[Math.floor(Math.random() * topMatches.length)];
  }

  /**
   * Find an alternative comment (different from the given text)
   */
  private findAlternativeComment(
    ctx: ClaudyContext,
    exclude: string
  ): CommentSelection | null {
    const matches: CommentSelection[] = [];

    for (const category of this.categories) {
      if (!category.match(ctx)) continue;

      const comments = this.resolveComments(category, ctx);
      for (const comment of comments) {
        if (
          comment.text !== exclude &&
          comment.priority >= (this.config.minPriority || 0)
        ) {
          matches.push({
            text: comment.text,
            category: category.name,
            priority: comment.priority,
          });
        }
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Random selection (don't strictly prioritize here)
    return matches[Math.floor(Math.random() * matches.length)];
  }

  /**
   * Resolve comments from a category (handles both static and dynamic)
   */
  private resolveComments(
    category: CommentCategory,
    ctx: ClaudyContext
  ): Comment[] {
    if (typeof category.comments === "function") {
      return category.comments(ctx);
    }
    return category.comments;
  }

  /**
   * Record a comment to avoid repetition
   */
  private recordComment(text: string): void {
    this.lastComment = text;
    this.recentComments.add(text);

    // Keep only last 10 comments in memory
    if (this.recentComments.size > 10) {
      const first = this.recentComments.values().next().value;
      if (first) {
        this.recentComments.delete(first);
      }
    }
  }

  /**
   * Get the last comment shown
   */
  getLastComment(): string | null {
    return this.lastComment;
  }

  /**
   * Reset the engine state
   */
  reset(): void {
    this.lastComment = null;
    this.recentComments.clear();
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<PersonalityEngineConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.categories) {
      this.categories = config.categories;
    }
  }
}
