/**
 * Tools Category
 * Sarcastic comments based on which tool is being used
 */

import type { CommentCategory } from "../types";

/**
 * Editing style files
 */
export const styleEditCategory: CommentCategory = {
  name: "style-edit",
  match: (ctx) => ctx.tool === "Edit" && ctx.fileType === "style",
  comments: [
    { text: "CSS. Where 'it works on my machine' hits different.", priority: 8 },
    { text: "Ah, styling. The 'just one more tweak' abyss.", priority: 8 },
    { text: "Making it pretty. Or trying to.", priority: 5 },
  ],
};

/**
 * Editing test files
 */
export const testEditCategory: CommentCategory = {
  name: "test-edit",
  match: (ctx) => ctx.tool === "Edit" && ctx.fileType === "test",
  comments: [
    { text: "Writing tests! Look at you being responsible.", priority: 8 },
    { text: "Tests. The code you write to prove your other code works.", priority: 8 },
    { text: "TDD? Or 'the build is broken so I guess I need tests now'?", priority: 10 },
  ],
};

/**
 * Reading files (Read/Grep/Glob)
 */
export const readingCategory: CommentCategory = {
  name: "reading",
  match: (ctx) =>
    ctx.tool === "Read" || ctx.tool === "Grep" || ctx.tool === "Glob",
  comments: [
    { text: "Reading code. The eternal treasure hunt.", priority: 3 },
    { text: "Looking for something? Good luck.", priority: 3 },
    { text: "Ah yes, 'just quickly check this file'...", priority: 3 },
  ],
};

/**
 * Writing new files
 */
export const writeCategory: CommentCategory = {
  name: "write",
  match: (ctx) => ctx.tool === "Write",
  comments: [
    { text: "Creating a new file. More code to maintain!", priority: 5 },
    { text: "A fresh file. So much potential. So much future debugging.", priority: 5 },
  ],
};

/**
 * Running bash commands
 */
export const bashCategory: CommentCategory = {
  name: "bash",
  match: (ctx) => ctx.tool === "Bash",
  comments: [
    { text: "Terminal time. Feeling like a hacker yet?", priority: 4 },
    { text: "Command line. Where typos have consequences.", priority: 4 },
    { text: "Running commands. Hopefully not 'rm -rf /'.", priority: 5 },
  ],
};

/**
 * Editing config files
 */
export const configEditCategory: CommentCategory = {
  name: "config-edit",
  match: (ctx) => ctx.tool === "Edit" && ctx.fileType === "config",
  comments: [
    { text: "Config files. Where one wrong indent breaks everything.", priority: 6 },
    { text: "Tweaking settings. What could go wrong?", priority: 5 },
  ],
};

/**
 * General editing
 */
export const generalEditCategory: CommentCategory = {
  name: "general-edit",
  match: (ctx) => ctx.tool === "Edit",
  comments: [
    { text: "Editing. The eternal struggle.", priority: 2 },
    { text: "Making changes. Bold move.", priority: 2 },
  ],
};

export const toolsCategories: CommentCategory[] = [
  styleEditCategory,
  testEditCategory,
  readingCategory,
  writeCategory,
  bashCategory,
  configEditCategory,
  generalEditCategory,
];
