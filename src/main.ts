import { ClaudyAnimation, ClaudyState } from "./claudy-css";
import "./claudy.css";

// Detect if running in Tauri or browser
const isTauri = '__TAURI__' in window;

let activeProjects: string[] = [];
let focusedIndex = 0;

const app = document.getElementById("app")!;

// Create UI with Lottie container
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

// State-specific messages
const stateMessages: Partial<Record<ClaudyState, string>> = {
  wake: "Ready to help!",
  happy: "Task complete!",
  confused: "Hmm, something went wrong...",
  listening: "I'm listening...",
  thinking: "Let me think...",
  working: "Working on it...",
};

// Handle state update (shared between Tauri and WebSocket)
function handleStateUpdate(state: ClaudyState, projects?: string[]) {
  console.log("[Claudy Frontend] Received state:", state);

  // Update CSS animation
  claudy.setState(state);

  // Update state label
  stateLabel.textContent = state;

  // Update projects if provided (WebSocket sends full state)
  if (projects) {
    activeProjects = projects;
    renderProjectSwitcher();
  }

  // Show bubble for certain states
  const message = stateMessages[state];
  if (message) {
    showBubble(message);
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
  });
} else {
  // Browser mode: use WebSocket
  connectWebSocket();
}
