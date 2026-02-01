/**
 * Tools Category
 * Comments based on which tool is being used
 */

import type { CommentCategory } from "../types";

/**
 * Editing style files
 */
export const styleEditCategory: CommentCategory = {
  name: "style-edit",
  match: (ctx) => ctx.tool === "Edit" && ctx.fileType === "style",
  comments: [
    { text: "Pillar på stylingen!", priority: 5 },
    { text: "CSS-magi pågår...", priority: 5 },
    { text: "Gör det snyggt! ✨", priority: 5 },
  ],
};

/**
 * Editing test files
 */
export const testEditCategory: CommentCategory = {
  name: "test-edit",
  match: (ctx) => ctx.tool === "Edit" && ctx.fileType === "test",
  comments: [
    { text: "Tester! Bra tänkt.", priority: 6 },
    { text: "TDD för vinsten!", priority: 6 },
    { text: "Kvalitetskontroll pågår...", priority: 5 },
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
    { text: "Läser och lär...", priority: 3 },
    { text: "Vad står det här då?", priority: 3 },
    { text: "Utforskar koden...", priority: 3 },
  ],
};

/**
 * Writing new files
 */
export const writeCategory: CommentCategory = {
  name: "write",
  match: (ctx) => ctx.tool === "Write",
  comments: [
    { text: "Ny fil på gång!", priority: 4 },
    { text: "Skapar något nytt...", priority: 4 },
  ],
};

/**
 * Running bash commands
 */
export const bashCategory: CommentCategory = {
  name: "bash",
  match: (ctx) => ctx.tool === "Bash",
  comments: [
    { text: "Kör terminalen...", priority: 3 },
    { text: "Bash-magi! 🪄", priority: 3 },
    { text: "Kommandorad-tid!", priority: 3 },
  ],
};

/**
 * Editing config files
 */
export const configEditCategory: CommentCategory = {
  name: "config-edit",
  match: (ctx) => ctx.tool === "Edit" && ctx.fileType === "config",
  comments: [
    { text: "Konfigurerar...", priority: 4 },
    { text: "Finjusterar inställningarna.", priority: 4 },
  ],
};

/**
 * General editing
 */
export const generalEditCategory: CommentCategory = {
  name: "general-edit",
  match: (ctx) => ctx.tool === "Edit",
  comments: [
    { text: "Editerar...", priority: 2 },
    { text: "Lite ändringar här och där.", priority: 2 },
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
