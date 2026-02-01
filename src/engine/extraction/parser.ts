/**
 * Event Parser
 * Parses raw JSONL events to structured ClaudeEventType
 */

import type { ClaudeEventType, RawClaudeEvent } from "./types";

/**
 * Map raw event type strings to our ClaudeEventType enum
 */
const EVENT_TYPE_MAP: Record<string, ClaudeEventType> = {
  // Session lifecycle
  init: "session_start",
  system: "session_start",

  // User interaction
  user: "user_message",
  human: "user_message",

  // Claude's thinking process
  thinking: "thinking",

  // Tool operations
  tool_use: "tool_use",
  tool_result: "tool_result",

  // Output states
  text: "talking",
  assistant: "talking",

  // Waiting states
  waiting: "waiting",
  input_wait: "waiting",

  // Completion
  stop: "stop",
  end: "stop",
  result: "stop",

  // Errors
  error: "error",
};

/**
 * Parse a raw event into a structured ClaudeEventType
 */
export function parseEventType(raw: RawClaudeEvent): ClaudeEventType {
  const rawType = (raw.type || "").toLowerCase();

  // Direct mapping
  if (rawType in EVENT_TYPE_MAP) {
    return EVENT_TYPE_MAP[rawType];
  }

  // Heuristic fallbacks
  if (raw.tool_name) return "tool_use";
  if (raw.error) return "error";
  if (raw.content && typeof raw.content === "string") return "talking";

  return "waiting";
}

/**
 * Extract tool name from raw event
 */
export function extractToolName(raw: RawClaudeEvent): string | undefined {
  return raw.tool_name as string | undefined;
}

/**
 * Extract file path from raw event (for file-related tools)
 */
export function extractFilePath(raw: RawClaudeEvent): string | undefined {
  // Try common field names
  if (raw.file_path) return raw.file_path as string;
  if (raw.path) return raw.path as string;

  // Try to extract from tool arguments
  if (raw.input && typeof raw.input === "object") {
    const input = raw.input as Record<string, unknown>;
    if (input.file_path) return input.file_path as string;
    if (input.path) return input.path as string;
  }

  return undefined;
}

/**
 * Determine message length category
 */
export function categorizeMessageLength(
  content: string | undefined
): "short" | "medium" | "long" | undefined {
  if (!content) return undefined;

  const length = content.length;
  if (length < 50) return "short";
  if (length < 500) return "medium";
  return "long";
}

/**
 * Check if an event indicates an error result
 */
export function isErrorResult(raw: RawClaudeEvent): boolean {
  if (raw.error) return true;
  if (raw.type === "error") return true;
  if (raw.result === "error") return true;
  if (raw.is_error === true) return true;
  return false;
}
