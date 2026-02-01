/**
 * Debugging Category
 * Comments for debugging patterns (same file, errors in a row)
 */

import type { CommentCategory } from "../types";

/**
 * Repeated file access - debugging pattern
 */
export const repeatedFileCategory: CommentCategory = {
  name: "repeated-file",
  match: (ctx) => ctx.sameFileCount >= 3,
  comments: [
    { text: "Tillbaka till samma fil igen... klassiker!", priority: 10 },
    { text: "Det ser ut som att du försöker debugga. Vill du ha hjälp? 📎", priority: 15 },
    { text: "Tredje gången gillt?", priority: 8 },
    { text: "Den filen får mycket kärlek idag!", priority: 8 },
  ],
};

/**
 * Multiple recent errors - struggling
 */
export const multipleErrorsCategory: CommentCategory = {
  name: "multiple-errors",
  match: (ctx) => ctx.recentErrors >= 2,
  comments: [
    { text: "Lite motigt just nu, men du klarar det!", priority: 12 },
    { text: "Fel händer de bästa. Ta ett djupt andetag! 🧘", priority: 12 },
    { text: "Debugging är en konstform...", priority: 10 },
  ],
};

/**
 * Single error just happened
 */
export const singleErrorCategory: CommentCategory = {
  name: "single-error",
  match: (ctx) => ctx.result === "error",
  comments: [
    { text: "Oops! Något gick fel...", priority: 5 },
    { text: "Hmm, det där funkade inte riktigt.", priority: 5 },
    { text: "Fel! Men inget vi inte kan fixa.", priority: 5 },
  ],
};

export const debuggingCategories: CommentCategory[] = [
  repeatedFileCategory,
  multipleErrorsCategory,
  singleErrorCategory,
];
