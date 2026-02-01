/**
 * Clippy Category
 * Sarcastic "It looks like you're..." Clippy-style comments
 */

import type { CommentCategory } from "../types";

/**
 * Working on README
 */
export const readmeCategory: CommentCategory = {
  name: "readme",
  match: (ctx) => ctx.targetFile?.toLowerCase().includes("readme") ?? false,
  comments: [
    { text: "A README? Do people actually read those?", priority: 20 },
    { text: "Documentation! HAH! How optimistic of you.", priority: 18 },
    { text: "Writing docs no one will read. Noble.", priority: 15 },
    { text: "README.md - the most fictional file in any repo.", priority: 18 },
  ],
};

/**
 * Working on package.json
 */
export const packageJsonCategory: CommentCategory = {
  name: "package-json",
  match: (ctx) => ctx.targetFile?.endsWith("package.json") ?? false,
  comments: [
    { text: "Ah yes, the dependency casino.", priority: 18 },
    { text: "Adding more node_modules? Bold.", priority: 15 },
    { text: "package.json - where dreams become 2GB folders.", priority: 18 },
  ],
};

/**
 * Working on git-related files
 */
export const gitCategory: CommentCategory = {
  name: "git",
  match: (ctx) =>
    ctx.targetFile?.includes(".git") ||
    ctx.targetFile?.includes("gitignore") ||
    false,
  comments: [
    { text: "Hiding your sins in .gitignore?", priority: 15 },
    { text: "What are we pretending doesn't exist today?", priority: 12 },
    { text: "Hiding that .claude folder are we? Don't forget CLAUDE.md", priority: 12 },
  ],
};

/**
 * Working on CI/CD files
 */
export const cicdCategory: CommentCategory = {
  name: "cicd",
  match: (ctx) =>
    ctx.targetFile?.includes(".github/workflows") ||
    ctx.targetFile?.includes("Dockerfile") ||
    ctx.targetFile?.includes("docker-compose") ||
    false,
  comments: [
    { text: "CI/CD - because breaking prod manually is too easy.", priority: 18 },
    { text: "Automating the destruction. Efficient.", priority: 15 },
    { text: "Docker? Hope you like debugging YAML.", priority: 15 },
  ],
};

/**
 * Working on env files
 */
export const envCategory: CommentCategory = {
  name: "env",
  match: (ctx) => ctx.targetFile?.includes(".env") ?? false,
  comments: [
    { text: "Secrets! Don't commit those. Again.", priority: 20 },
    { text: ".env - where API keys go to get leaked.", priority: 18 },
    { text: "Environment variables. Very mysterious.", priority: 12 },
  ],
};

/**
 * Working on index files
 */
export const indexCategory: CommentCategory = {
  name: "index",
  match: (ctx) =>
    ctx.targetFile?.endsWith("index.ts") ||
    ctx.targetFile?.endsWith("index.js") ||
    ctx.targetFile?.endsWith("index.tsx") ||
    false,
  comments: [
    { text: "The index file. Where exports go to party.", priority: 8 },
    { text: "Barrel file time. How exciting.", priority: 8 },
  ],
};

/**
 * Lots of activity (high event count)
 */
export const busySessionCategory: CommentCategory = {
  name: "busy-session",
  match: (ctx) => ctx.eventCount > 50,
  comments: [
    { text: "Wow, you're really going at it. Coffee break?", priority: 12 },
    { text: "Someone's productive today. Suspicious.", priority: 12 },
  ],
};

/**
 * Same tool used many times
 */
export const sameToolCategory: CommentCategory = {
  name: "same-tool",
  match: (ctx) => ctx.sameToolCount >= 5,
  comments: [
    { text: "Using that tool a lot. Found a favorite?", priority: 8 },
    { text: "Same tool, fifth time. Stuck in a loop?", priority: 10 },
  ],
};

export const clippyCategories: CommentCategory[] = [
  readmeCategory,
  packageJsonCategory,
  gitCategory,
  cicdCategory,
  envCategory,
  indexCategory,
  busySessionCategory,
  sameToolCategory,
];
