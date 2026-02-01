/**
 * Clippy Category
 * Special "It looks like you're..." Clippy-style comments
 */

import type { CommentCategory } from "../types";

/**
 * Working on README
 */
export const readmeCategory: CommentCategory = {
  name: "readme",
  match: (ctx) => ctx.targetFile?.toLowerCase().includes("readme") ?? false,
  comments: [
    {
      text: "Det ser ut som att du skriver dokumentation. Vill du ha hjälp? 📎",
      priority: 20,
    },
    { text: "README! Bra för framtida dig.", priority: 15 },
    { text: "Dokumentation är kärlek! ❤️", priority: 15 },
  ],
};

/**
 * Working on package.json
 */
export const packageJsonCategory: CommentCategory = {
  name: "package-json",
  match: (ctx) => ctx.targetFile?.endsWith("package.json") ?? false,
  comments: [
    { text: "Det ser ut som att du hanterar dependencies. 📎", priority: 18 },
    { text: "package.json - hjärtat av projektet!", priority: 12 },
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
    { text: "Git-konfiguration! Viktigt.", priority: 10 },
    { text: "Versionskontroll FTW!", priority: 10 },
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
    { text: "Det ser ut som att du sätter upp CI/CD. 📎", priority: 18 },
    { text: "DevOps-magi! ✨", priority: 15 },
    { text: "Automatisering är bäst.", priority: 12 },
  ],
};

/**
 * Working on env files
 */
export const envCategory: CommentCategory = {
  name: "env",
  match: (ctx) => ctx.targetFile?.includes(".env") ?? false,
  comments: [
    { text: "Miljövariabler! Kom ihåg att inte committa hemligheter. 🔐", priority: 20 },
    { text: "Secrets... spännande!", priority: 12 },
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
    { text: "Entrypoint-tid!", priority: 8 },
    { text: "Index-filen - där allt börjar.", priority: 8 },
  ],
};

/**
 * Lots of activity (high event count)
 */
export const busySessionCategory: CommentCategory = {
  name: "busy-session",
  match: (ctx) => ctx.eventCount > 50,
  comments: [
    { text: "Wow, mycket aktivitet! Du är på rulle!", priority: 12 },
    { text: "Produktiviteten är hög idag! 🚀", priority: 12 },
  ],
};

/**
 * Same tool used many times
 */
export const sameToolCategory: CommentCategory = {
  name: "same-tool",
  match: (ctx) => ctx.sameToolCount >= 5,
  comments: [
    { text: "Någon gillar det verktyget!", priority: 8 },
    { text: "Effektivt! Samma verktyg, många resultat.", priority: 8 },
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
