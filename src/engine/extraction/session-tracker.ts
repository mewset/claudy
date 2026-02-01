/**
 * Session Tracker
 * Tracks session history for pattern recognition
 */

import type { ClaudyContext, ClaudeEventType } from "./types";
import { isSameFile } from "./file-classifier";

const MAX_HISTORY = 50;
const RECENT_ERROR_WINDOW = 10;

interface EventRecord {
  event: ClaudeEventType;
  timestamp: number;
  tool?: string;
  file?: string;
  isError: boolean;
}

export class SessionTracker {
  private sessionStart: number = Date.now();
  private history: EventRecord[] = [];
  private eventCount: number = 0;

  /**
   * Record a new event
   */
  record(
    event: ClaudeEventType,
    timestamp: number,
    tool?: string,
    file?: string,
    isError: boolean = false
  ): void {
    this.eventCount++;

    this.history.push({
      event,
      timestamp,
      tool,
      file,
      isError,
    });

    // Keep history bounded
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
  }

  /**
   * Reset the session (e.g., on session_start event)
   */
  reset(): void {
    this.sessionStart = Date.now();
    this.history = [];
    this.eventCount = 0;
  }

  /**
   * Get session duration in seconds
   */
  getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStart) / 1000);
  }

  /**
   * Get total event count
   */
  getEventCount(): number {
    return this.eventCount;
  }

  /**
   * Get session start timestamp
   */
  getSessionStart(): number {
    return this.sessionStart;
  }

  /**
   * Count consecutive same-file operations
   */
  getSameFileCount(currentFile?: string): number {
    if (!currentFile) return 0;

    let count = 1;
    for (let i = this.history.length - 1; i >= 0; i--) {
      const record = this.history[i];
      if (record.file && isSameFile(record.file, currentFile)) {
        count++;
      } else if (record.file) {
        break;
      }
    }
    return count;
  }

  /**
   * Count consecutive same-tool operations
   */
  getSameToolCount(currentTool?: string): number {
    if (!currentTool) return 0;

    let count = 1;
    for (let i = this.history.length - 1; i >= 0; i--) {
      const record = this.history[i];
      if (record.tool === currentTool) {
        count++;
      } else if (record.tool) {
        break;
      }
    }
    return count;
  }

  /**
   * Count recent errors within the window
   */
  getRecentErrors(): number {
    const recentHistory = this.history.slice(-RECENT_ERROR_WINDOW);
    return recentHistory.filter((r) => r.isError).length;
  }

  /**
   * Get list of recently touched files
   */
  getLastFiles(limit: number = 5): string[] {
    const files: string[] = [];
    const seen = new Set<string>();

    for (let i = this.history.length - 1; i >= 0 && files.length < limit; i--) {
      const record = this.history[i];
      if (record.file && !seen.has(record.file)) {
        files.push(record.file);
        seen.add(record.file);
      }
    }

    return files;
  }

  /**
   * Check if we've had a recent struggle (multiple attempts at same file)
   */
  hasRecentStruggle(): boolean {
    const recentHistory = this.history.slice(-RECENT_ERROR_WINDOW);
    const errorCount = recentHistory.filter((r) => r.isError).length;
    return errorCount >= 2;
  }

  /**
   * Build partial context from tracker state
   */
  buildTrackerContext(
    currentFile?: string,
    currentTool?: string
  ): Partial<ClaudyContext> {
    return {
      sessionStart: this.sessionStart,
      sessionDuration: this.getSessionDuration(),
      eventCount: this.eventCount,
      sameFileCount: this.getSameFileCount(currentFile),
      sameToolCount: this.getSameToolCount(currentTool),
      recentErrors: this.getRecentErrors(),
      lastFiles: this.getLastFiles(),
    };
  }
}
