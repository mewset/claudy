/**
 * Extraction Engine Types
 * Types for parsing and structuring Claude Code events
 */

export type ClaudeEventType =
  | "session_start"
  | "user_message"
  | "thinking"
  | "tool_use"
  | "tool_result"
  | "talking"
  | "waiting"
  | "stop"
  | "error";

export type FileType = "code" | "config" | "style" | "docs" | "test" | "unknown";

export interface ClaudyContext {
  // Event
  event: ClaudeEventType;
  project: string;
  timestamp: number;

  // Tool
  tool?: string;
  targetFile?: string;
  fileType?: FileType;

  // Session
  sessionStart: number;
  sessionDuration: number;
  eventCount: number;

  // Patterns
  sameFileCount: number;
  sameToolCount: number;
  recentErrors: number;
  lastFiles: string[];

  // Result
  result?: "success" | "error" | "pending";
  errorMessage?: string;

  // User input analysis
  userMessageLength?: "short" | "medium" | "long";
}

/**
 * Raw event from JSONL logs or WebSocket
 */
export interface RawClaudeEvent {
  type: string;
  timestamp?: number;
  tool_name?: string;
  file_path?: string;
  error?: string;
  content?: string;
  [key: string]: unknown;
}
