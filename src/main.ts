import { listen } from "@tauri-apps/api/event";
import type { ClaudyState } from "./claudy";

console.log("Claudy starting...");

const app = document.getElementById("app")!;

// Create placeholder UI (will be replaced by Rive animation later)
app.innerHTML = `
  <div class="claudy-placeholder">
    <div class="face">
      <div class="eyes">◕ ◕</div>
      <div class="mouth">‿</div>
    </div>
    <div class="state-label">idle</div>
  </div>
`;

// Listen for state changes from backend
listen<string>("claudy-state-change", (event) => {
  const state = event.payload as ClaudyState;
  console.log("State changed:", state);
  updatePlaceholder(state);
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
