import { ClaudyAnimation, ClaudyState } from "./claudy-css";
import { ContextState } from "./engine/context";
import { PersonalityEngine } from "./engine/personality";
import type { RawClaudeEvent } from "./engine/extraction/types";
import { applyTheme } from "./themes";
import "./claudy.css";

/**
 * Backend event type (matches Rust ClaudeEvent enum)
 */
interface BackendEvent {
  SessionStart?: { project: string };
  UserMessage?: { project: string };
  Thinking?: { project: string };
  ToolUse?: { project: string; tool: string; file_path?: string };
  Talking?: { project: string };
  WaitingForTask?: { project: string };
  Stop?: { project: string; success: boolean };
  Error?: { project: string; message: string };
}

/**
 * Full state from backend WebSocket
 */
interface BackendState {
  current_state: string;
  active_projects: string[];
  focused_project?: string;
  last_event?: BackendEvent;
  bubble_text?: string;
  suppress_comments?: boolean;
}

// Detect if running in Tauri or browser (Tauri 2 uses __TAURI_INTERNALS__)
const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
console.log("[Claudy] Environment check - isTauri:", isTauri,
  "__TAURI__:", (window as any).__TAURI__,
  "__TAURI_INTERNALS__:", (window as any).__TAURI_INTERNALS__);

// Debug mode: show state label with ?debug in URL
const isDebug = new URLSearchParams(window.location.search).has('debug');

let activeProjects: string[] = [];
let focusedIndex = 0;

const app = document.getElementById("app")!;

// Enable debug mode if ?debug in URL
if (isDebug) {
  app.classList.add('debug');
}

// Create UI
app.innerHTML = `
  <div class="project-switcher">
    <div class="workspace-indicator"></div>
    <div class="project-name">No project</div>
  </div>
  <div id="claudy-animation"></div>
  <div class="state-label">intro</div>
  <div id="bubble" class="bubble hidden">
    <span class="bubble-text"></span>
  </div>
`;

// Initialize CSS animation
const animationContainer = app.querySelector("#claudy-animation") as HTMLElement;
const claudy = new ClaudyAnimation("/claudy-parts");
claudy.init(animationContainer, true); // true = play intro first

// Initialize engines
const contextState = new ContextState();
const personalityEngine = new PersonalityEngine({
  commentChance: 0.8, // 80% chance to show comment
});

// Matrix overlay for "working" state
function generateBinaryString(length: number): string {
  return Array.from({ length }, () => Math.random() > 0.5 ? '1' : '0').join('');
}

function createMatrixOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'matrix-overlay';

  const NUM_ROWS = 12;
  const CHARS_PER_ROW = 40;

  for (let i = 0; i < NUM_ROWS; i++) {
    const row = document.createElement('div');
    row.className = 'matrix-row';
    // Double the string for seamless scroll loop
    const binary = generateBinaryString(CHARS_PER_ROW);
    row.textContent = binary + binary;
    overlay.appendChild(row);
  }

  return overlay;
}

// Find the wrapper created by ClaudyAnimation and append matrix to it
const claudyWrapper = animationContainer.querySelector('.claudy-wrapper');
const matrixOverlay = createMatrixOverlay();
if (claudyWrapper) {
  claudyWrapper.appendChild(matrixOverlay);
}

function setMatrixActive(active: boolean) {
  matrixOverlay.classList.toggle('active', active);
}

// Re-select elements WITHIN app to avoid duplicates
const workspaceIndicator = app.querySelector(".workspace-indicator")!;
const projectName = app.querySelector(".project-name")!;
const stateLabel = app.querySelector(".state-label")!;

// Update label when animation internally changes state (one-shot → idle)
claudy.setOnStateChange((state) => {
  stateLabel.textContent = state;
});

function renderProjectSwitcher() {
  if (activeProjects.length === 0) {
    workspaceIndicator.textContent = "";
    projectName.textContent = "No project";
    return;
  }

  if (activeProjects.length > 1) {
    const indicators = activeProjects.map((_, i) =>
      i === focusedIndex ? `[${i + 1}]` : `${i + 1}`
    ).join(" ");
    workspaceIndicator.textContent = indicators;
  } else {
    workspaceIndicator.textContent = "";
  }

  const current = activeProjects[focusedIndex];
  // Extract clean project name from path slug
  const cleanName = current.replace(/^-/, "").split("-").pop() || current;
  projectName.textContent = cleanName;
}

// Click to cycle through projects
projectName.addEventListener("click", () => {
  if (activeProjects.length > 1) {
    focusedIndex = (focusedIndex + 1) % activeProjects.length;
    renderProjectSwitcher();
  }
});

// Bubble elements (scoped to app)
const bubble = app.querySelector("#bubble")!;
const bubbleText = bubble.querySelector(".bubble-text")!;
let bubbleTimeout: number | null = null;

function showBubble(message: string, duration: number = 5000) {
  bubbleText.textContent = message;
  bubble.classList.remove("hidden");

  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout);
  }

  bubbleTimeout = window.setTimeout(() => {
    bubble.classList.add("hidden");
  }, duration);
}

/**
 * Convert BackendEvent to RawClaudeEvent for our engine
 */
function backendEventToRawEvent(event: BackendEvent): RawClaudeEvent {
  const timestamp = Date.now();

  if (event.SessionStart) {
    return { type: "init", timestamp };
  }
  if (event.UserMessage) {
    return { type: "user", timestamp };
  }
  if (event.Thinking) {
    return { type: "thinking", timestamp };
  }
  if (event.ToolUse) {
    return {
      type: "tool_use",
      timestamp,
      tool_name: event.ToolUse.tool,
      file_path: event.ToolUse.file_path,
    };
  }
  if (event.Talking) {
    return { type: "text", timestamp };
  }
  if (event.Stop) {
    return {
      type: "stop",
      timestamp,
      result: event.Stop.success ? "success" : "error",
    };
  }
  if (event.Error) {
    return {
      type: "error",
      timestamp,
      error: event.Error.message,
    };
  }
  if (event.WaitingForTask) {
    return { type: "waiting", timestamp };
  }

  return { type: "waiting", timestamp };
}

/**
 * Fallback: Create a RawClaudeEvent from ClaudyState when no last_event available
 */
function stateToRawEvent(state: ClaudyState): RawClaudeEvent {
  const timestamp = Date.now();
  const typeMap: Record<string, string> = {
    intro: "init",
    wake: "init",
    listening: "user",
    thinking: "thinking",
    working: "tool_use",
    talking: "text",
    happy: "stop",
    confused: "error",
    idle: "waiting",
    sleepy: "waiting",
  };
  return { type: typeMap[state] || "waiting", timestamp };
}

// Flag to suppress personality comments when custom bubble is active
let suppressPersonalityComments = false;

// Subscribe to context updates for personality-based comments
contextState.subscribe((ctx) => {
  console.log("[Claudy Engine] Context update:", ctx.event);

  // Skip if custom bubble is active
  if (suppressPersonalityComments) {
    console.log("[Claudy Engine] Skipping personality comment (custom bubble active)");
    return;
  }

  // Get comment from personality engine
  const comment = personalityEngine.selectComment(ctx);
  if (comment) {
    console.log("[Claudy Engine] Showing comment:", comment);
    showBubble(comment);
  }
});

// Handle state update (shared between Tauri and WebSocket)
function handleStateUpdate(state: ClaudyState, projects?: string[], lastEvent?: BackendEvent, bubbleText?: string, suppressComments?: boolean) {
  console.log("[Claudy Frontend] Received state:", state, "event:", lastEvent, "bubble:", bubbleText, "suppress:", suppressComments);

  // Update CSS animation (direct, for responsiveness)
  claudy.setState(state);

  // Update state label
  stateLabel.textContent = state;

  // Toggle matrix effect for working state
  setMatrixActive(state === 'working');

  // Suppress personality comments if requested (for demos)
  if (suppressComments) {
    suppressPersonalityComments = true;
    setTimeout(() => {
      suppressPersonalityComments = false;
    }, 5000);
  }

  // Show bubble text if provided (for demos/external control)
  if (bubbleText) {
    suppressPersonalityComments = true;
    showBubble(bubbleText);
    // Re-enable personality comments after bubble duration
    setTimeout(() => {
      suppressPersonalityComments = false;
    }, 5000);
  }

  // Update projects if provided (WebSocket sends full state)
  if (projects) {
    activeProjects = projects;
    renderProjectSwitcher();

    // Update context state project
    if (projects.length > 0) {
      contextState.setProject(projects[focusedIndex] || projects[0]);
    }
  }

  // Feed rich event to context engine (or fallback to state-based)
  const rawEvent = lastEvent
    ? backendEventToRawEvent(lastEvent)
    : stateToRawEvent(state);
  contextState.handleEvent(rawEvent);
}

// WebSocket connection for browser mode
const WS_PORT = 3695;
const WS_RECONNECT_DELAY = 5000;

function connectWebSocket() {
  const wsUrl = `ws://${window.location.hostname}:${WS_PORT}`;
  console.log("[Claudy WS] Connecting to", wsUrl);

  stateLabel.textContent = "connecting...";

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("[Claudy WS] Connected");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as BackendState;
      const state = data.current_state as ClaudyState;
      const projects = data.active_projects;
      const lastEvent = data.last_event;
      const bubbleText = data.bubble_text;
      const suppressComments = data.suppress_comments;
      handleStateUpdate(state, projects, lastEvent, bubbleText, suppressComments);
    } catch (e) {
      console.error("[Claudy WS] Failed to parse message:", e);
    }
  };

  ws.onclose = () => {
    console.log("[Claudy WS] Disconnected, reconnecting in", WS_RECONNECT_DELAY, "ms");
    stateLabel.textContent = "disconnected";
    setTimeout(connectWebSocket, WS_RECONNECT_DELAY);
  };

  ws.onerror = (error) => {
    console.error("[Claudy WS] Error:", error);
  };
}

// Initialize based on environment
if (isTauri) {
  // Tauri mode: use IPC events
  import("@tauri-apps/api/event").then(({ listen }) => {
    listen<string>("claudy-state-change", async (event) => {
      const state = event.payload as ClaudyState;

      // Fetch projects via invoke
      import("@tauri-apps/api/core").then(async ({ invoke }) => {
        try {
          const projects = await invoke<string[]>("get_active_projects");
          handleStateUpdate(state, projects);
        } catch (e) {
          console.error("Failed to get projects:", e);
          handleStateUpdate(state);
        }
      });
    });
  });

  // Initial project load
  import("@tauri-apps/api/core").then(async ({ invoke }) => {
    try {
      activeProjects = await invoke<string[]>("get_active_projects");
      renderProjectSwitcher();
    } catch (e) {
      console.error("Failed to get projects:", e);
    }

    // Apply appearance config (background color and theme)
    try {
      const appearance = await invoke<{ background?: string; theme?: string }>("get_appearance_config");
      console.log("[Claudy] Appearance config:", appearance);
      if (appearance.background) {
        console.log("[Claudy] Setting background to:", appearance.background);
        document.body.style.backgroundColor = appearance.background;
      }
      // Apply theme (defaults to 'default' if not set or invalid)
      const themeId = appearance.theme || 'default';
      console.log("[Claudy] Applying theme:", themeId);
      applyTheme(themeId);
    } catch (e) {
      console.error("Failed to get appearance config:", e);
      applyTheme('default'); // Fallback to default theme
    }
  });
} else {
  // Browser mode: use WebSocket
  connectWebSocket();
}
