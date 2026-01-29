import { ClaudyAnimation, ClaudyState } from "./claudy-css";
import "./claudy.css";

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

// State-specific messages (random selection)
const stateMessages: Partial<Record<ClaudyState, string[]>> = {
  wake: [
    "Ready to help!",
    "What's up?",
    "Hey there!",
    "At your service!",
  ],
  happy: [
    "Task complete!",
    "Done and done!",
    "Nailed it!",
    "All finished!",
  ],
  confused: [
    "Hmm, something went wrong...",
    "That didn't work...",
    "Oops, let me check that...",
    "Well, that's odd...",
  ],
  listening: [
    "I'm listening...",
    "Go on...",
    "Tell me more...",
    "Mhm...",
  ],
  thinking: [
    "Let me think...",
    "Hmm...",
    "Processing...",
    "One moment...",
  ],
  working: [
    "Working on it...",
    "On it!",
    "Doing the thing...",
    "Busy busy...",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Handle state update (shared between Tauri and WebSocket)
function handleStateUpdate(state: ClaudyState, projects?: string[]) {
  console.log("[Claudy Frontend] Received state:", state);

  // Update CSS animation
  claudy.setState(state);

  // Update state label
  stateLabel.textContent = state;

  // Toggle matrix effect for working state
  setMatrixActive(state === 'working');

  // Update projects if provided (WebSocket sends full state)
  if (projects) {
    activeProjects = projects;
    renderProjectSwitcher();
  }

  // Show bubble for certain states (pick random variant)
  const messages = stateMessages[state];
  if (messages) {
    showBubble(pickRandom(messages));
  }
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
      const data = JSON.parse(event.data);
      const state = data.current_state as ClaudyState;
      const projects = data.active_projects as string[];
      handleStateUpdate(state, projects);
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

    // Apply appearance config (background color)
    try {
      const appearance = await invoke<{ background?: string }>("get_appearance_config");
      console.log("[Claudy] Appearance config:", appearance);
      if (appearance.background) {
        console.log("[Claudy] Setting background to:", appearance.background);
        document.body.style.backgroundColor = appearance.background;
      }
    } catch (e) {
      console.error("Failed to get appearance config:", e);
    }
  });
} else {
  // Browser mode: use WebSocket
  connectWebSocket();
}
