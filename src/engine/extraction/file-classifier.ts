/**
 * File Classifier
 * Classifies file paths by type for context-aware comments
 */

import type { FileType } from "./types";

/**
 * Classify a file path by its type
 */
export function classifyFile(path: string): FileType {
  if (!path) return "unknown";

  // Test files
  if (/\.(test|spec)\.(ts|js|tsx|jsx)$/.test(path)) return "test";
  if (/__tests__\//.test(path)) return "test";
  if (/\.test\.(py|rb|go)$/.test(path)) return "test";

  // Style files
  if (/\.(css|scss|sass|less)$/.test(path)) return "style";
  if (/\.styled\.(ts|js|tsx|jsx)$/.test(path)) return "style";
  if (/tailwind\.config/.test(path)) return "style";

  // Documentation
  if (/\.(md|mdx|txt|doc|docx|rst)$/.test(path)) return "docs";
  if (/README/i.test(path)) return "docs";
  if (/CHANGELOG/i.test(path)) return "docs";
  if (/LICENSE/i.test(path)) return "docs";

  // Config files
  if (/(package|tsconfig|jsconfig)\.json$/.test(path)) return "config";
  if (/\.(config|rc)\.(ts|js|json|yaml|yml)$/.test(path)) return "config";
  if (/^\.[a-z]+rc$/.test(path.split("/").pop() || "")) return "config";
  if (/\.env(\..+)?$/.test(path)) return "config";
  if (/Cargo\.toml$/.test(path)) return "config";
  if (/pyproject\.toml$/.test(path)) return "config";

  // Code files
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path)) return "code";
  if (/\.(rs|py|rb|go|java|kt|swift|c|cpp|h|hpp)$/.test(path)) return "code";
  if (/\.(vue|svelte|astro)$/.test(path)) return "code";

  return "unknown";
}

/**
 * Extract the file name from a path
 */
export function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

/**
 * Check if two paths refer to the same file
 */
export function isSameFile(path1: string, path2: string): boolean {
  if (!path1 || !path2) return false;
  return getFileName(path1) === getFileName(path2);
}
