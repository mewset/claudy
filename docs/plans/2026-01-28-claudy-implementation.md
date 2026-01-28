# Claudy MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working Claudy MVP - a system tray app with animated mascot that reacts to Claude Code events.

**Architecture:** Tauri app with Rust backend (file watching, config, tray) and web frontend (Rive animation, UI). CLI binary for project registration.

**Tech Stack:** Rust, Tauri 2.0, TypeScript, Rive, TOML config

---

## Phase 1: Project Scaffolding

### Task 1.1: Initialize Tauri Project

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `package.json`
- Create: `src/index.html`
- Create: `src/main.ts`

**Step 1: Install Tauri CLI**

Run: `cargo install tauri-cli`

**Step 2: Create Tauri project**

Run: `cargo tauri init`

When prompted:
- App name: `claudy`
- Window title: `Claudy`
- Frontend dev URL: `http://localhost:5173`
- Frontend build command: `npm run build`
- Frontend dev command: `npm run dev`
- Frontend dist directory: `dist`

**Step 3: Initialize npm project**

```bash
npm init -y
npm install -D typescript vite @anthropic-ai/claude-code
npm install @tauri-apps/api
```

**Step 4: Create minimal index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claudy</title>
  <style>
    body {
      margin: 0;
      background: transparent;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/main.ts"></script>
</body>
</html>
```

**Step 5: Create minimal main.ts**

```typescript
console.log("Claudy starting...");
```

**Step 6: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

**Step 7: Verify build works**

Run: `cargo tauri build --debug`
Expected: Builds successfully, creates binary in `src-tauri/target/debug/`

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize Tauri project scaffold"
```

---

### Task 1.2: Configure System Tray

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/tauri.conf.json`
- Create: `src-tauri/icons/tray-icon.png`

**Step 1: Add tray dependencies to Cargo.toml**

Add to `[dependencies]`:
```toml
tauri-plugin-shell = "2"
```

Add to `[features]`:
```toml
default = ["tray-icon"]
tray-icon = []
```

**Step 2: Create placeholder tray icon**

Create a 32x32 PNG at `src-tauri/icons/tray-icon.png` (orange circle placeholder).

**Step 3: Configure tray in tauri.conf.json**

Add to root config:
```json
{
  "app": {
    "trayIcon": {
      "iconPath": "icons/tray-icon.png",
      "iconAsTemplate": false
    }
  }
}
```

**Step 4: Implement tray in main.rs**

```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    Manager,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show/Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 5: Verify tray works**

Run: `cargo tauri dev`
Expected: App starts, tray icon appears, right-click shows menu, "Quit" closes app

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add system tray with basic menu"
```

---

### Task 1.3: Configure Overlay Window

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src/index.html`
- Modify: `src/main.ts`

**Step 1: Configure window properties in tauri.conf.json**

```json
{
  "app": {
    "windows": [
      {
        "title": "Claudy",
        "width": 200,
        "height": 250,
        "x": 100,
        "y": 100,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "resizable": false,
        "visible": false
      }
    ]
  }
}
```

**Step 2: Update index.html for transparency**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claudy</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      background: transparent;
      overflow: hidden;
      height: 100%;
    }
    #app {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .claudy-container {
      width: 150px;
      height: 150px;
      background: #f97316;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui;
      font-size: 48px;
    }
  </style>
</head>
<body>
  <div id="app">
    <div class="claudy-container">:)</div>
  </div>
  <script type="module" src="/main.ts"></script>
</body>
</html>
```

**Step 3: Verify overlay window**

Run: `cargo tauri dev`
Expected: Transparent window with orange circle, stays on top, no decorations

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: configure transparent overlay window"
```

---

## Phase 2: Configuration System

### Task 2.1: Create Config Module

**Files:**
- Create: `src-tauri/src/config.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add dependencies to Cargo.toml**

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
toml = "0.8"
directories = "5"
```

**Step 2: Create config.rs**

```rust
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    #[serde(default)]
    pub position: PositionConfig,
    #[serde(default)]
    pub appearance: AppearanceConfig,
    #[serde(default)]
    pub notifications: NotificationConfig,
    #[serde(default)]
    pub behavior: BehaviorConfig,
    #[serde(default)]
    pub projects: ProjectsConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PositionConfig {
    #[serde(default = "default_x")]
    pub x: i32,
    #[serde(default = "default_y")]
    pub y: i32,
    #[serde(default = "default_anchor")]
    pub anchor: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppearanceConfig {
    #[serde(default = "default_size")]
    pub size: String,
    #[serde(default = "default_theme")]
    pub theme: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationConfig {
    #[serde(default = "default_true")]
    pub sound: bool,
    #[serde(default = "default_true")]
    pub os_notifications: bool,
    #[serde(default = "default_bubble_duration")]
    pub bubble_duration: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BehaviorConfig {
    #[serde(default)]
    pub auto_start: bool,
    #[serde(default = "default_idle_timeout")]
    pub idle_timeout: u32,
    #[serde(default = "default_sleepy_timeout")]
    pub sleepy_timeout: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ProjectsConfig {
    #[serde(default)]
    pub registered: Vec<String>,
}

// Default functions
fn default_x() -> i32 { 100 }
fn default_y() -> i32 { 100 }
fn default_anchor() -> String { "bottom-right".to_string() }
fn default_size() -> String { "medium".to_string() }
fn default_theme() -> String { "auto".to_string() }
fn default_true() -> bool { true }
fn default_bubble_duration() -> u32 { 5 }
fn default_idle_timeout() -> u32 { 30 }
fn default_sleepy_timeout() -> u32 { 300 }

impl Default for Config {
    fn default() -> Self {
        Self {
            position: PositionConfig::default(),
            appearance: AppearanceConfig::default(),
            notifications: NotificationConfig::default(),
            behavior: BehaviorConfig::default(),
            projects: ProjectsConfig::default(),
        }
    }
}

impl Default for PositionConfig {
    fn default() -> Self {
        Self {
            x: default_x(),
            y: default_y(),
            anchor: default_anchor(),
        }
    }
}

impl Default for AppearanceConfig {
    fn default() -> Self {
        Self {
            size: default_size(),
            theme: default_theme(),
        }
    }
}

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            sound: default_true(),
            os_notifications: default_true(),
            bubble_duration: default_bubble_duration(),
        }
    }
}

impl Default for BehaviorConfig {
    fn default() -> Self {
        Self {
            auto_start: false,
            idle_timeout: default_idle_timeout(),
            sleepy_timeout: default_sleepy_timeout(),
        }
    }
}

pub fn config_path() -> PathBuf {
    let dirs = directories::ProjectDirs::from("com", "claudy", "claudy")
        .expect("Could not determine config directory");
    dirs.config_dir().join("config.toml")
}

pub fn load_config() -> Config {
    let path = config_path();
    if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_default();
        toml::from_str(&content).unwrap_or_default()
    } else {
        Config::default()
    }
}

pub fn save_config(config: &Config) -> Result<(), Box<dyn std::error::Error>> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = toml::to_string_pretty(config)?;
    fs::write(path, content)?;
    Ok(())
}
```

**Step 3: Add module to main.rs**

Add at top of main.rs:
```rust
mod config;
```

**Step 4: Test config loading**

Add temporary test in main():
```rust
let cfg = config::load_config();
println!("Config loaded: {:?}", cfg);
```

Run: `cargo tauri dev`
Expected: Config prints to console, no errors

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add configuration module with TOML support"
```

---

### Task 2.2: Create CLI Binary

**Files:**
- Create: `src-tauri/src/bin/claudy-cli.rs`
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add clap dependency**

```toml
[dependencies]
clap = { version = "4", features = ["derive"] }
```

Add binary target:
```toml
[[bin]]
name = "claudy"
path = "src/bin/claudy-cli.rs"
```

**Step 2: Create claudy-cli.rs**

```rust
use clap::{Parser, Subcommand};
use std::env;
use std::path::PathBuf;

mod config;

#[derive(Parser)]
#[command(name = "claudy")]
#[command(about = "Claudy - Your Claude Code companion")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Register current directory for watching
    Register,
    /// Unregister current directory
    Unregister,
    /// List registered projects
    List,
    /// Show Claudy status
    Status,
    /// Open config file location
    Config,
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Register) => register_project(),
        Some(Commands::Unregister) => unregister_project(),
        Some(Commands::List) => list_projects(),
        Some(Commands::Status) => show_status(),
        Some(Commands::Config) => show_config(),
        None => start_daemon(),
    }
}

fn register_project() {
    let current_dir = env::current_dir().expect("Could not get current directory");
    let path = current_dir.to_string_lossy().to_string();

    let mut cfg = config::load_config();

    if cfg.projects.registered.contains(&path) {
        println!("Project already registered: {}", path);
        return;
    }

    cfg.projects.registered.push(path.clone());
    config::save_config(&cfg).expect("Failed to save config");
    println!("Registered: {}", path);
}

fn unregister_project() {
    let current_dir = env::current_dir().expect("Could not get current directory");
    let path = current_dir.to_string_lossy().to_string();

    let mut cfg = config::load_config();

    if let Some(pos) = cfg.projects.registered.iter().position(|p| p == &path) {
        cfg.projects.registered.remove(pos);
        config::save_config(&cfg).expect("Failed to save config");
        println!("Unregistered: {}", path);
    } else {
        println!("Project not registered: {}", path);
    }
}

fn list_projects() {
    let cfg = config::load_config();

    if cfg.projects.registered.is_empty() {
        println!("No projects registered.");
        println!("Use 'claudy register' in a project directory to add one.");
        return;
    }

    println!("Registered projects:");
    for project in &cfg.projects.registered {
        println!("  - {}", project);
    }
}

fn show_status() {
    println!("Claudy status: Not yet implemented");
    // TODO: Check if daemon is running, show active sessions
}

fn show_config() {
    let path = config::config_path();
    println!("Config file: {}", path.display());
}

fn start_daemon() {
    println!("Starting Claudy daemon...");
    // TODO: Start the Tauri app or connect to running instance
}
```

**Step 3: Fix module path issue**

The CLI needs access to config module. Create a shared library:

Create `src-tauri/src/lib.rs`:
```rust
pub mod config;
```

Update `claudy-cli.rs` imports:
```rust
use claudy::config;
```

Update `Cargo.toml`:
```toml
[lib]
name = "claudy"
path = "src/lib.rs"
```

**Step 4: Build and test CLI**

Run: `cargo build --bin claudy`
Run: `./target/debug/claudy --help`
Expected: Shows help with subcommands

Run: `./target/debug/claudy register`
Expected: Registers current directory

Run: `./target/debug/claudy list`
Expected: Shows registered project

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add CLI with register/unregister/list commands"
```

---

## Phase 3: Session Watching

### Task 3.1: Create Session Watcher

**Files:**
- Create: `src-tauri/src/watcher.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add notify dependency**

```toml
[dependencies]
notify = "6"
```

**Step 2: Create watcher.rs**

```rust
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event};
use std::path::Path;
use std::sync::mpsc::channel;
use std::time::Duration;

pub struct SessionWatcher {
    watcher: RecommendedWatcher,
}

#[derive(Debug, Clone)]
pub enum ClaudeEvent {
    SessionStart { project: String },
    UserMessage { project: String },
    AssistantWorking { project: String },
    ToolUse { project: String, tool: String },
    Stop { project: String, success: bool },
    Error { project: String, message: String },
}

impl SessionWatcher {
    pub fn new<F>(callback: F) -> Result<Self, notify::Error>
    where
        F: Fn(ClaudeEvent) + Send + 'static,
    {
        let (tx, rx) = channel();

        let watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default().with_poll_interval(Duration::from_millis(500)),
        )?;

        // Spawn thread to process events
        std::thread::spawn(move || {
            while let Ok(event) = rx.recv() {
                if let Some(claude_event) = parse_file_event(&event) {
                    callback(claude_event);
                }
            }
        });

        Ok(Self { watcher })
    }

    pub fn watch_project(&mut self, path: &Path) -> Result<(), notify::Error> {
        // Watch the .claude/projects directory for this project
        let claude_path = dirs::home_dir()
            .unwrap()
            .join(".claude")
            .join("projects")
            .join(path_to_slug(path));

        if claude_path.exists() {
            self.watcher.watch(&claude_path, RecursiveMode::Recursive)?;
        }
        Ok(())
    }
}

fn path_to_slug(path: &Path) -> String {
    path.to_string_lossy()
        .replace("/", "-")
        .trim_start_matches('-')
        .to_string()
}

fn parse_file_event(event: &Event) -> Option<ClaudeEvent> {
    // Only care about modify events on .jsonl files
    if !event.kind.is_modify() {
        return None;
    }

    let path = event.paths.first()?;
    if path.extension()?.to_str()? != "jsonl" {
        return None;
    }

    // Extract project name from path
    let project = path
        .parent()?
        .file_name()?
        .to_string_lossy()
        .to_string();

    // Read last line of file to determine event type
    let content = std::fs::read_to_string(path).ok()?;
    let last_line = content.lines().last()?;

    parse_jsonl_line(last_line, &project)
}

fn parse_jsonl_line(line: &str, project: &str) -> Option<ClaudeEvent> {
    let json: serde_json::Value = serde_json::from_str(line).ok()?;

    let event_type = json.get("type")?.as_str()?;

    match event_type {
        "user" => Some(ClaudeEvent::UserMessage {
            project: project.to_string(),
        }),
        "assistant" => Some(ClaudeEvent::AssistantWorking {
            project: project.to_string(),
        }),
        "progress" => {
            let data = json.get("data")?;
            let progress_type = data.get("type")?.as_str()?;

            if progress_type == "hook_progress" {
                let hook_event = data.get("hookEvent")?.as_str()?;
                match hook_event {
                    "SessionStart" => Some(ClaudeEvent::SessionStart {
                        project: project.to_string(),
                    }),
                    "Stop" => Some(ClaudeEvent::Stop {
                        project: project.to_string(),
                        success: true,
                    }),
                    _ => None,
                }
            } else {
                None
            }
        }
        _ => None,
    }
}
```

**Step 3: Add serde_json dependency**

```toml
[dependencies]
serde_json = "1"
dirs = "5"
```

**Step 4: Add module to lib.rs**

```rust
pub mod config;
pub mod watcher;
```

**Step 5: Test watcher compiles**

Run: `cargo build`
Expected: Compiles without errors

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add session file watcher for Claude Code events"
```

---

### Task 3.2: Integrate Watcher with Tauri

**Files:**
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/src/state.rs`

**Step 1: Create state.rs for app state**

```rust
use std::sync::{Arc, Mutex};
use crate::watcher::ClaudeEvent;

#[derive(Debug, Clone, Default)]
pub struct ClaudyState {
    pub current_state: String,
    pub active_projects: Vec<String>,
    pub focused_project: Option<String>,
    pub last_event: Option<ClaudeEvent>,
}

impl ClaudyState {
    pub fn new() -> Self {
        Self {
            current_state: "idle".to_string(),
            active_projects: vec![],
            focused_project: None,
            last_event: None,
        }
    }

    pub fn handle_event(&mut self, event: ClaudeEvent) {
        self.last_event = Some(event.clone());

        match &event {
            ClaudeEvent::SessionStart { project } => {
                if !self.active_projects.contains(project) {
                    self.active_projects.push(project.clone());
                }
                if self.focused_project.is_none() {
                    self.focused_project = Some(project.clone());
                }
                self.current_state = "wake".to_string();
            }
            ClaudeEvent::UserMessage { .. } => {
                self.current_state = "listening".to_string();
            }
            ClaudeEvent::AssistantWorking { .. } => {
                self.current_state = "thinking".to_string();
            }
            ClaudeEvent::ToolUse { .. } => {
                self.current_state = "working".to_string();
            }
            ClaudeEvent::Stop { project, success } => {
                self.current_state = if *success { "happy" } else { "confused" }.to_string();
                // Remove from active projects after a delay
            }
            ClaudeEvent::Error { .. } => {
                self.current_state = "confused".to_string();
            }
        }
    }
}

pub type SharedState = Arc<Mutex<ClaudyState>>;
```

**Step 2: Update main.rs to use watcher**

```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, State,
};
use std::sync::{Arc, Mutex};

mod config;
mod watcher;
mod state;

use state::{ClaudyState, SharedState};
use watcher::SessionWatcher;

#[tauri::command]
fn get_state(state: State<SharedState>) -> String {
    let s = state.lock().unwrap();
    s.current_state.clone()
}

#[tauri::command]
fn get_active_projects(state: State<SharedState>) -> Vec<String> {
    let s = state.lock().unwrap();
    s.active_projects.clone()
}

fn main() {
    let shared_state: SharedState = Arc::new(Mutex::new(ClaudyState::new()));
    let state_for_watcher = shared_state.clone();

    tauri::Builder::default()
        .manage(shared_state)
        .invoke_handler(tauri::generate_handler![get_state, get_active_projects])
        .setup(move |app| {
            // Setup tray (existing code)
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show/Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // Start watcher for registered projects
            let cfg = config::load_config();
            let state_clone = state_for_watcher.clone();
            let app_handle = app.handle().clone();

            std::thread::spawn(move || {
                let mut watcher = SessionWatcher::new(move |event| {
                    let mut s = state_clone.lock().unwrap();
                    s.handle_event(event.clone());

                    // Emit event to frontend
                    let _ = app_handle.emit("claudy-state-change", &s.current_state);
                }).expect("Failed to create watcher");

                for project_path in &cfg.projects.registered {
                    let path = std::path::Path::new(project_path);
                    if let Err(e) = watcher.watch_project(path) {
                        eprintln!("Failed to watch {}: {}", project_path, e);
                    }
                }

                // Keep thread alive
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(60));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 3: Verify builds**

Run: `cargo build`
Expected: Compiles without errors

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: integrate session watcher with Tauri app state"
```

---

## Phase 4: Frontend Animation

### Task 4.1: Setup Rive Integration

**Files:**
- Modify: `package.json`
- Modify: `src/main.ts`
- Create: `src/claudy.ts`
- Create: `src/assets/claudy.riv` (placeholder)

**Step 1: Install Rive**

```bash
npm install @rive-app/canvas
```

**Step 2: Create claudy.ts**

```typescript
import { Rive, StateMachineInput } from "@rive-app/canvas";

export type ClaudyState =
  | "idle"
  | "wake"
  | "listening"
  | "thinking"
  | "working"
  | "happy"
  | "confused"
  | "sleepy";

export class ClaudyAnimation {
  private rive: Rive | null = null;
  private stateInput: StateMachineInput | null = null;

  async init(canvas: HTMLCanvasElement, rivFile: string) {
    this.rive = new Rive({
      src: rivFile,
      canvas: canvas,
      autoplay: true,
      stateMachines: "State Machine 1",
      onLoad: () => {
        this.stateInput = this.rive?.stateMachineInputs("State Machine 1")
          ?.find(input => input.name === "state") || null;
        this.setState("idle");
      },
    });
  }

  setState(state: ClaudyState) {
    if (!this.stateInput) return;

    const stateMap: Record<ClaudyState, number> = {
      idle: 0,
      wake: 1,
      listening: 2,
      thinking: 3,
      working: 4,
      happy: 5,
      confused: 6,
      sleepy: 7,
    };

    this.stateInput.value = stateMap[state];
  }

  destroy() {
    this.rive?.cleanup();
  }
}
```

**Step 3: Update main.ts**

```typescript
import { listen } from "@tauri-apps/api/event";
import { ClaudyAnimation, ClaudyState } from "./claudy";

const app = document.getElementById("app")!;

// Create canvas for Rive
const canvas = document.createElement("canvas");
canvas.id = "claudy-canvas";
canvas.width = 150;
canvas.height = 150;
app.appendChild(canvas);

// For now, show placeholder until we have Rive file
const placeholder = document.createElement("div");
placeholder.className = "claudy-placeholder";
placeholder.innerHTML = `
  <div class="face">
    <div class="eyes">◕ ◕</div>
    <div class="mouth">‿</div>
  </div>
  <div class="state-label">idle</div>
`;
app.appendChild(placeholder);

// Listen for state changes from backend
listen<string>("claudy-state-change", (event) => {
  const state = event.payload as ClaudyState;
  updatePlaceholder(state);
});

function updatePlaceholder(state: ClaudyState) {
  const label = document.querySelector(".state-label");
  const mouth = document.querySelector(".mouth");

  if (label) label.textContent = state;

  if (mouth) {
    const mouths: Record<ClaudyState, string> = {
      idle: "‿",
      wake: "○",
      listening: "•",
      thinking: "～",
      working: "⌐",
      happy: "◡",
      confused: "？",
      sleepy: "～",
    };
    mouth.textContent = mouths[state];
  }
}
```

**Step 4: Update index.html styles**

```html
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html, body {
    background: transparent;
    overflow: hidden;
    height: 100%;
    font-family: system-ui, -apple-system, sans-serif;
  }
  #app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .claudy-placeholder {
    width: 150px;
    height: 150px;
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 20px rgba(249, 115, 22, 0.4);
  }
  .face {
    font-size: 32px;
    text-align: center;
  }
  .eyes {
    margin-bottom: -5px;
  }
  .mouth {
    font-size: 28px;
  }
  .state-label {
    margin-top: 10px;
    font-size: 12px;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  #claudy-canvas {
    display: none; /* Hidden until Rive file is ready */
  }
</style>
```

**Step 5: Verify frontend works**

Run: `cargo tauri dev`
Expected: Orange circle with face, shows "idle" state

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Rive animation setup with placeholder UI"
```

---

### Task 4.2: Add Speech Bubble

**Files:**
- Modify: `src/main.ts`
- Modify: `src/index.html`

**Step 1: Add bubble HTML structure**

Add to index.html body:
```html
<div id="app">
  <!-- Claudy content here -->
</div>
<div id="bubble" class="bubble hidden">
  <span class="bubble-text"></span>
</div>
```

**Step 2: Add bubble styles**

```css
.bubble {
  position: absolute;
  bottom: 170px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 8px 16px;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 180px;
  text-align: center;
  font-size: 14px;
  color: #333;
  transition: opacity 0.2s, transform 0.2s;
}
.bubble::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}
.bubble.hidden {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
  pointer-events: none;
}
```

**Step 3: Add bubble logic to main.ts**

```typescript
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

// Update state change listener
listen<string>("claudy-state-change", (event) => {
  const state = event.payload as ClaudyState;
  updatePlaceholder(state);

  // Show bubble for certain states
  const messages: Partial<Record<ClaudyState, string>> = {
    happy: "Task complete! 🎉",
    confused: "Hmm, something went wrong...",
    wake: "Ready to help!",
  };

  if (messages[state]) {
    showBubble(messages[state]!);
  }
});
```

**Step 4: Verify bubble works**

Run: `cargo tauri dev`
Manually test by emitting events (temporary test code)

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add speech bubble for notifications"
```

---

### Task 4.3: Add Project Switcher UI

**Files:**
- Modify: `src/main.ts`
- Modify: `src/index.html`

**Step 1: Add project switcher HTML**

Add above claudy-placeholder in index.html:
```html
<div class="project-switcher">
  <div class="workspace-indicator"></div>
  <div class="project-name">No project</div>
</div>
```

**Step 2: Add styles**

```css
.project-switcher {
  position: absolute;
  top: 10px;
  text-align: center;
  color: #666;
  font-size: 12px;
}
.workspace-indicator {
  margin-bottom: 2px;
  font-family: monospace;
  font-size: 10px;
  letter-spacing: 2px;
}
.workspace-indicator:empty {
  display: none;
}
.project-name {
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}
.project-name:hover {
  background: rgba(0, 0, 0, 0.05);
}
```

**Step 3: Add switcher logic**

```typescript
import { invoke } from "@tauri-apps/api/core";

const workspaceIndicator = document.querySelector(".workspace-indicator")!;
const projectName = document.querySelector(".project-name")!;

let activeProjects: string[] = [];
let focusedIndex = 0;

async function updateProjects() {
  activeProjects = await invoke<string[]>("get_active_projects");
  renderProjectSwitcher();
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
  projectName.textContent = current.split("/").pop() || current;
}

projectName.addEventListener("click", () => {
  if (activeProjects.length > 1) {
    focusedIndex = (focusedIndex + 1) % activeProjects.length;
    renderProjectSwitcher();
  }
});

// Update projects on state change
listen<string>("claudy-state-change", async () => {
  await updateProjects();
});

// Initial load
updateProjects();
```

**Step 4: Verify switcher works**

Run: `cargo tauri dev`
Expected: Shows "No project" initially, updates when sessions are active

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add project switcher with workspace indicator"
```

---

## Phase 5: Polish & Integration

### Task 5.1: Window Positioning

**Files:**
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/src/window.rs`

**Step 1: Create window.rs**

```rust
use tauri::{LogicalPosition, Manager, WebviewWindow};
use crate::config::Config;

pub fn position_window(window: &WebviewWindow, config: &Config) {
    let monitor = window.current_monitor().ok().flatten();

    if let Some(monitor) = monitor {
        let size = monitor.size();
        let scale = monitor.scale_factor();

        let window_size = window.outer_size().unwrap_or_default();

        let (x, y) = match config.position.anchor.as_str() {
            "bottom-right" => (
                (size.width as f64 / scale) as i32 - window_size.width as i32 - config.position.x,
                (size.height as f64 / scale) as i32 - window_size.height as i32 - config.position.y,
            ),
            "bottom-left" => (
                config.position.x,
                (size.height as f64 / scale) as i32 - window_size.height as i32 - config.position.y,
            ),
            "top-right" => (
                (size.width as f64 / scale) as i32 - window_size.width as i32 - config.position.x,
                config.position.y,
            ),
            "top-left" => (
                config.position.x,
                config.position.y,
            ),
            _ => (config.position.x, config.position.y),
        };

        let _ = window.set_position(LogicalPosition::new(x, y));
    }
}
```

**Step 2: Add module and use in main.rs**

Add to lib.rs:
```rust
pub mod window;
```

In main.rs setup:
```rust
use crate::window::position_window;

// In setup closure, after window is available:
if let Some(window) = app.get_webview_window("main") {
    let cfg = config::load_config();
    position_window(&window, &cfg);
}
```

**Step 3: Verify positioning**

Run: `cargo tauri dev`
Expected: Window appears at configured position

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add configurable window positioning"
```

---

### Task 5.2: OS Notifications Fallback

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/main.rs`

**Step 1: Add notification plugin**

```toml
[dependencies]
tauri-plugin-notification = "2"
```

**Step 2: Register plugin in main.rs**

```rust
use tauri_plugin_notification::NotificationExt;

// In builder:
tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    // ... rest of setup
```

**Step 3: Add notification command**

```rust
#[tauri::command]
fn send_notification(app: tauri::AppHandle, title: &str, body: &str) {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .ok();
}
```

**Step 4: Update invoke_handler**

```rust
.invoke_handler(tauri::generate_handler![get_state, get_active_projects, send_notification])
```

**Step 5: Verify notifications**

Run: `cargo tauri dev`
Test notification command from devtools

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add OS notification fallback"
```

---

### Task 5.3: Final Integration Test

**Files:**
- No new files, integration testing

**Step 1: Build release binary**

```bash
cargo tauri build
```

**Step 2: Register test project**

```bash
./target/release/claudy register
./target/release/claudy list
```

**Step 3: Start Claudy daemon**

```bash
./target/release/claudy
```

**Step 4: Start Claude Code in registered project**

Open a new terminal, navigate to registered project, run `claude`

**Step 5: Verify events flow**

- SessionStart → Claudy shows "wake" state, bubble "Ready to help!"
- Send message → Claudy shows "listening" state
- Claude responds → Claudy shows "thinking" state
- Claude uses tool → Claudy shows "working" state
- Claude finishes → Claudy shows "happy" state, bubble "Task complete!"

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete MVP integration"
git push origin feature/mvp
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1.1-1.3 | Project scaffolding, tray, overlay window |
| 2 | 2.1-2.2 | Config system, CLI |
| 3 | 3.1-3.2 | Session watcher, Tauri integration |
| 4 | 4.1-4.3 | Rive setup, bubble, project switcher |
| 5 | 5.1-5.3 | Positioning, notifications, integration test |

**Total tasks:** 13
**Estimated commits:** 13

---

*Plan created 2026-01-28*
