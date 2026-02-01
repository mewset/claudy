import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface Config {
  appearance: {
    background?: string;
    size: string;
    theme: string;
  };
  projects: {
    registered: string[];
  };
}

// Elements
const backgroundInput = document.getElementById("background") as HTMLInputElement;
const backgroundPicker = document.getElementById("background-picker") as HTMLInputElement;
const projectList = document.getElementById("project-list") as HTMLUListElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const closeBtn = document.getElementById("close-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

let currentConfig: Config | null = null;

// Sync color picker with text input
backgroundPicker.addEventListener("input", () => {
  backgroundInput.value = backgroundPicker.value;
});

backgroundInput.addEventListener("input", () => {
  const value = backgroundInput.value.trim();
  if (value.match(/^#[0-9a-fA-F]{6}$/)) {
    backgroundPicker.value = value;
  }
});

function showStatus(message: string, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? "status error" : "status";
  if (!isError) {
    setTimeout(() => {
      statusEl.textContent = "";
    }, 3000);
  }
}

function renderProjects(projects: string[]) {
  if (projects.length === 0) {
    projectList.innerHTML = '<li class="empty-state">No projects registered</li>';
    return;
  }

  projectList.innerHTML = projects
    .map(
      (path) => `
      <li class="project-item">
        <span class="project-path" title="${path}">${path}</span>
        <button class="remove-btn" data-path="${path}" title="Remove project">&times;</button>
      </li>
    `
    )
    .join("");

  // Add click handlers for remove buttons
  projectList.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const path = (e.target as HTMLButtonElement).dataset.path;
      if (path) {
        await removeProject(path);
      }
    });
  });
}

async function removeProject(path: string) {
  try {
    await invoke("remove_project", { path });
    showStatus(`Removed: ${path.split("/").pop()}`);
    await loadConfig();
  } catch (e) {
    showStatus(`Failed to remove project: ${e}`, true);
  }
}

async function loadConfig() {
  try {
    currentConfig = await invoke<Config>("get_full_config");

    // Set appearance values
    const bg = currentConfig.appearance.background || "";
    backgroundInput.value = bg;
    if (bg.match(/^#[0-9a-fA-F]{6}$/)) {
      backgroundPicker.value = bg;
    }

    // Render projects
    renderProjects(currentConfig.projects.registered);
  } catch (e) {
    showStatus(`Failed to load config: ${e}`, true);
  }
}

async function saveConfig() {
  try {
    const background = backgroundInput.value.trim() || null;
    await invoke("save_appearance_config", { background });
    showStatus("Configuration saved! Restart Claudy to apply changes.");
  } catch (e) {
    showStatus(`Failed to save config: ${e}`, true);
  }
}

// Event listeners
saveBtn.addEventListener("click", saveConfig);

closeBtn.addEventListener("click", async () => {
  const window = getCurrentWindow();
  await window.close();
});

// Load config on startup
loadConfig();
