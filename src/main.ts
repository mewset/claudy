import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { ClaudyAnimation, ClaudyState } from "./claudy";

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

// Initialize Lottie animation
const animationContainer = app.querySelector("#claudy-animation") as HTMLElement;
const claudy = new ClaudyAnimation("/animations");
claudy.init(animationContainer, true); // true = play intro first

// Re-select elements WITHIN app to avoid duplicates
const workspaceIndicator = app.querySelector(".workspace-indicator")!;
const projectName = app.querySelector(".project-name")!;
const stateLabel = app.querySelector(".state-label")!;

async function updateProjects() {
  try {
    activeProjects = await invoke<string[]>("get_active_projects");
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

// Listen for state changes from backend
listen<string>("claudy-state-change", async (event) => {
  const state = event.payload as ClaudyState;

  // Update Lottie animation
  claudy.setState(state);

  // Update state label
  stateLabel.textContent = state;

  // Update projects list
  await updateProjects();

  // Show bubble for certain states
  const message = stateMessages[state];
  if (message) {
    showBubble(message);
  }
});
