/**
 * Session Category
 * Comments based on session state and duration
 */

import type { CommentCategory } from "../types";

/**
 * Very long session (>2 hours) - break reminder
 */
export const veryLongSessionCategory: CommentCategory = {
  name: "very-long-session",
  match: (ctx) => ctx.sessionDuration > 7200, // 2 hours
  comments: [
    { text: "Lång session! Dags för en paus kanske?", priority: 15 },
    { text: "Du har kodat i över 2 timmar. Kaffe? ☕", priority: 15 },
    { text: "Maraton-session! Glöm inte att sträcka på dig.", priority: 15 },
  ],
};

/**
 * Long session (>1 hour)
 */
export const longSessionCategory: CommentCategory = {
  name: "long-session",
  match: (ctx) => ctx.sessionDuration > 3600, // 1 hour
  comments: [
    { text: "En timme redan! Tiden flyger.", priority: 8 },
    { text: "Produktiv session hittills!", priority: 8 },
  ],
};

/**
 * Session just started
 */
export const sessionStartCategory: CommentCategory = {
  name: "session-start",
  match: (ctx) => ctx.event === "session_start",
  comments: [
    { text: "Hej! Redo att koda?", priority: 20 },
    { text: "Ny session! Vad ska vi bygga idag?", priority: 20 },
    { text: "Välkommen tillbaka! 👋", priority: 20 },
  ],
};

/**
 * User sends a message
 */
export const userMessageCategory: CommentCategory = {
  name: "user-message",
  match: (ctx) => ctx.event === "user_message",
  comments: [
    { text: "Jag lyssnar...", priority: 2 },
    { text: "Berätta mer...", priority: 2 },
    { text: "Mhm...", priority: 2 },
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
    { text: "Oj, det var mycket! Låt mig läsa...", priority: 8 },
    { text: "Detaljerat! Bra med kontext.", priority: 8 },
  ],
};

/**
 * Task completed (stop event)
 */
export const taskCompleteCategory: CommentCategory = {
  name: "task-complete",
  match: (ctx) => ctx.event === "stop",
  comments: [
    { text: "Klart!", priority: 10 },
    { text: "Fixat!", priority: 10 },
    { text: "Done and done!", priority: 10 },
    { text: "Där satt den! ✅", priority: 10 },
  ],
};

/**
 * Thinking phase
 */
export const thinkingCategory: CommentCategory = {
  name: "thinking",
  match: (ctx) => ctx.event === "thinking",
  comments: [
    { text: "Hmm, låt mig tänka...", priority: 3 },
    { text: "Ett ögonblick...", priority: 3 },
    { text: "Funderar...", priority: 3 },
  ],
};

/**
 * Working on something
 */
export const workingCategory: CommentCategory = {
  name: "working",
  match: (ctx) => ctx.event === "tool_use",
  comments: [
    { text: "Jobbar på det...", priority: 2 },
    { text: "Snart klart!", priority: 2 },
    { text: "Pågår...", priority: 2 },
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
