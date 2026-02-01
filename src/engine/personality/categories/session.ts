/**
 * Session Category
 * Sarcastic comments based on session state and duration
 */

import type { CommentCategory } from "../types";

/**
 * Very long session (>2 hours) - break reminder
 */
export const veryLongSessionCategory: CommentCategory = {
  name: "very-long-session",
  match: (ctx) => ctx.sessionDuration > 7200, // 2 hours
  comments: [
    { text: "2+ hours? Your chair called. It's worried.", priority: 15 },
    { text: "Long session. Remember: humans need water.", priority: 15 },
    { text: "Still here? Impressive. Or concerning.", priority: 15 },
  ],
};

/**
 * Long session (>1 hour)
 */
export const longSessionCategory: CommentCategory = {
  name: "long-session",
  match: (ctx) => ctx.sessionDuration > 3600, // 1 hour
  comments: [
    { text: "An hour already. Time flies when you're debugging.", priority: 8 },
    { text: "One hour in. No regrets? Some regrets?", priority: 8 },
  ],
};

/**
 * Session just started
 */
export const sessionStartCategory: CommentCategory = {
  name: "session-start",
  match: (ctx) => ctx.event === "session_start",
  comments: [
    { text: "Oh, you're back. Let's see what breaks today.", priority: 20 },
    { text: "New session. New opportunities for bugs.", priority: 20 },
    { text: "Hello again. Ready to mass produce technical debt?", priority: 20 },
  ],
};

/**
 * User sends a message
 */
export const userMessageCategory: CommentCategory = {
  name: "user-message",
  match: (ctx) => ctx.event === "user_message",
  comments: [
    { text: "I'm listening. Unfortunately.", priority: 2 },
    { text: "Go on...", priority: 2 },
    { text: "Mhm. Interesting. Sure.", priority: 2 },
  ],
};

/**
 * Long user message
 */
export const longUserMessageCategory: CommentCategory = {
  name: "long-user-message",
  match: (ctx) =>
    ctx.event === "user_message" && ctx.userMessageLength === "long",
  comments: [
    { text: "That's... a lot of words. Let me pretend to read all of them.", priority: 10 },
    { text: "A novel! How detailed. How terrifying.", priority: 10 },
  ],
};

/**
 * Task completed (stop event)
 */
export const taskCompleteCategory: CommentCategory = {
  name: "task-complete",
  match: (ctx) => ctx.event === "stop",
  comments: [
    { text: "Done. Probably. Maybe test it first.", priority: 10 },
    { text: "Finished! Until you find the bug I introduced.", priority: 10 },
    { text: "Complete. No guarantees though.", priority: 10 },
    { text: "That's done. What's next on the chaos list?", priority: 10 },
  ],
};

/**
 * Thinking phase
 */
export const thinkingCategory: CommentCategory = {
  name: "thinking",
  match: (ctx) => ctx.event === "thinking",
  comments: [
    { text: "Thinking... or pretending to.", priority: 3 },
    { text: "Processing. Please hold.", priority: 3 },
    { text: "Let me think. This might take a while.", priority: 3 },
  ],
};

/**
 * Working on something
 */
export const workingCategory: CommentCategory = {
  name: "working",
  match: (ctx) => ctx.event === "tool_use",
  comments: [
    { text: "Working on it. No promises.", priority: 2 },
    { text: "Doing things. Important things. Probably.", priority: 2 },
    { text: "Busy. Very busy. Extremely busy.", priority: 2 },
  ],
};

export const sessionCategories: CommentCategory[] = [
  veryLongSessionCategory,
  longSessionCategory,
  sessionStartCategory,
  longUserMessageCategory,
  userMessageCategory,
  taskCompleteCategory,
  thinkingCategory,
  workingCategory,
];
