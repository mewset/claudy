/**
 * Debugging Category
 * Sarcastic comments for debugging patterns
 */

import type { CommentCategory } from "../types";

/**
 * Repeated file access - debugging pattern
 */
export const repeatedFileCategory: CommentCategory = {
  name: "repeated-file",
  match: (ctx) => ctx.sameFileCount >= 3,
  comments: [
    { text: "Back to this file again? It's not gonna fix itself.", priority: 15 },
    { text: "Third time's the charm. Or fourth. Or fifth.", priority: 12 },
    { text: "This file is getting a lot of attention. Lucky file.", priority: 10 },
    { text: "Ah, the old 'edit-save-pray' loop.", priority: 12 },
  ],
};

/**
 * Multiple recent errors - struggling
 */
export const multipleErrorsCategory: CommentCategory = {
  name: "multiple-errors",
  match: (ctx) => ctx.recentErrors >= 2,
  comments: [
    { text: "Errors happen. Repeatedly, in your case.", priority: 15 },
    { text: "Have you tried turning it off and on again?",  priority: 12 },
    { text: "The code is fighting back. Stay strong.", priority: 12 },
    { text: "Debugging: the fun part, they said.", priority: 10 },
  ],
};

/**
 * Single error just happened
 */
export const singleErrorCategory: CommentCategory = {
  name: "single-error",
  match: (ctx) => ctx.result === "error",
  comments: [
    { text: "Oops. That didn't work.", priority: 5 },
    { text: "Error! But you knew that already.", priority: 5 },
    { text: "Well, that was unexpected. Or was it?", priority: 5 },
  ],
};

export const debuggingCategories: CommentCategory[] = [
  repeatedFileCategory,
  multipleErrorsCategory,
  singleErrorCategory,
];
