/**
 * Context State
 * Central state management with pub/sub pattern
 */

import type { ClaudyContext, RawClaudeEvent } from "./extraction/types";
import { SessionTracker } from "./extraction/session-tracker";
import {
  parseEventType,
  extractToolName,
  extractFilePath,
  categorizeMessageLength,
  isErrorResult,
} from "./extraction/parser";
import { classifyFile } from "./extraction/file-classifier";

export type ContextListener = (ctx: ClaudyContext) => void;

/**
 * Central state management for Claudy
 * Processes raw events and notifies subscribers with rich context
 */
export class ContextState {
  private tracker: SessionTracker;
  private listeners: ContextListener[] = [];
  private currentProject: string = "";

  constructor() {
    this.tracker = new SessionTracker();
  }

  /**
   * Set the current project name
   */
  setProject(project: string): void {
    this.currentProject = project;
  }

  /**
   * Handle a raw event from JSONL logs or WebSocket
   */
  handleEvent(rawEvent: RawClaudeEvent): void {
    const context = this.buildContext(rawEvent);

    // Record in tracker for pattern analysis
    this.tracker.record(
      context.event,
      context.timestamp,
      context.tool,
      context.targetFile,
      context.result === "error"
    );

    // Reset tracker on session start
    if (context.event === "session_start") {
      this.tracker.reset();
    }

    this.notify(context);
  }

  /**
   * Build a full ClaudyContext from a raw event
   */
  private buildContext(rawEvent: RawClaudeEvent): ClaudyContext {
    const event = parseEventType(rawEvent);
    const tool = extractToolName(rawEvent);
    const targetFile = extractFilePath(rawEvent);
    const timestamp = rawEvent.timestamp || Date.now();

    // Get tracker-computed values
    const trackerContext = this.tracker.buildTrackerContext(targetFile, tool);

    // Determine result status
    let result: "success" | "error" | "pending" | undefined;
    if (isErrorResult(rawEvent)) {
      result = "error";
    } else if (event === "tool_result") {
      result = "success";
    } else if (event === "tool_use") {
      result = "pending";
    }

    return {
      // Event
      event,
      project: this.currentProject,
      timestamp,

      // Tool
      tool,
      targetFile,
      fileType: targetFile ? classifyFile(targetFile) : undefined,

      // Session (from tracker)
      sessionStart: trackerContext.sessionStart!,
      sessionDuration: trackerContext.sessionDuration!,
      eventCount: trackerContext.eventCount!,

      // Patterns (from tracker)
      sameFileCount: trackerContext.sameFileCount!,
      sameToolCount: trackerContext.sameToolCount!,
      recentErrors: trackerContext.recentErrors!,
      lastFiles: trackerContext.lastFiles!,

      // Result
      result,
      errorMessage: rawEvent.error as string | undefined,

      // User message analysis
      userMessageLength:
        event === "user_message"
          ? categorizeMessageLength(rawEvent.content as string)
          : undefined,
    };
  }

  /**
   * Subscribe to context updates
   * Returns an unsubscribe function
   */
  subscribe(listener: ContextListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get the session tracker for direct access if needed
   */
  getTracker(): SessionTracker {
    return this.tracker;
  }

  /**
   * Notify all listeners of a context update
   */
  private notify(ctx: ClaudyContext): void {
    for (const listener of this.listeners) {
      try {
        listener(ctx);
      } catch (e) {
        console.error("[ContextState] Listener error:", e);
      }
    }
  }
}
