import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { ClaudyState } from "./claudy";

console.log("Claudy starting...");

let activeProjects: string[] = [];
let focusedIndex = 0;

const app = document.getElementById("app")!;

// Create placeholder UI (will be replaced by Rive animation later)
app.innerHTML = `
  <div class="project-switcher">
    <div class="workspace-indicator"></div>
    <div class="project-name">No project</div>
  </div>
  <div class="claudy-placeholder">
    <div class="face">
      <div class="eyes">◕ ◕</div>
      <div class="mouth">‿</div>
    </div>
    <div class="state-label">idle</div>
  </div>
`;

// Re-select elements after innerHTML is set
const workspaceIndicator = document.querySelector(".workspace-indicator")!;
const projectName = document.querySelector(".project-name")!;

async function updateProjects() {
  try {
    console.log("Fetching active projects...");
    activeProjects = await invoke<string[]>("get_active_projects");
    console.log("Got active projects:", activeProjects);
    renderProjectSwitcher();
  } catch (e) {
    console.error("Failed to get projects:", e);
  }
}

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

// Initial project load
updateProjects();

// Bubble elements
const bubble = document.getElementById("bubble")!;
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

// Listen for state changes from backend
console.log("Setting up state change listener...");
listen<string>("claudy-state-change", async (event) => {
  const state = event.payload as ClaudyState;
  console.log("🔔 STATE CHANGE RECEIVED:", state);
  updatePlaceholder(state);

  // Update projects list
  await updateProjects();

  // Show bubble for certain states
  const message = stateMessages[state];
  if (message) {
    showBubble(message);
  }
}).then(() => {
  console.log("✅ State change listener registered successfully");
}).catch((e) => {
  console.error("❌ Failed to register listener:", e);
});

function updatePlaceholder(state: ClaudyState) {
  const label = document.querySelector(".state-label");
  const mouth = document.querySelector(".mouth");
  const eyes = document.querySelector(".eyes");
  const placeholder = document.querySelector(".claudy-placeholder");

  if (label) label.textContent = state;

  // Update facial expression based on state
  if (mouth && eyes) {
    const expressions: Record<ClaudyState, { eyes: string; mouth: string }> = {
      idle: { eyes: "◕ ◕", mouth: "‿" },
      wake: { eyes: "◉ ◉", mouth: "○" },
      listening: { eyes: "◕ ◕", mouth: "•" },
      thinking: { eyes: "◔ ◔", mouth: "～" },
      working: { eyes: "◕ ◕", mouth: "⌐" },
      happy: { eyes: "◠ ◠", mouth: "◡" },
      confused: { eyes: "◑ ◐", mouth: "?" },
      sleepy: { eyes: "－ －", mouth: "～" },
    };

    const expr = expressions[state] || expressions.idle;
    eyes.textContent = expr.eyes;
    mouth.textContent = expr.mouth;
  }

  // Add animation class for state transitions
  if (placeholder) {
    placeholder.classList.remove("animate");
    void (placeholder as HTMLElement).offsetWidth; // Trigger reflow
    placeholder.classList.add("animate");
  }
}

// Initial state
updatePlaceholder("idle");
