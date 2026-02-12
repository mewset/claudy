#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, State, Emitter,
};
use std::sync::{Arc, Mutex};

mod config;
mod watcher;
mod state;
mod window;
mod websocket;

use state::{ClaudyState, SharedState};
use watcher::SessionWatcher;
use window::position_window;
use websocket::StateBroadcaster;

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

#[tauri::command]
fn send_notification(app: tauri::AppHandle, title: &str, body: &str) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_appearance_config() -> config::AppearanceConfig {
    let cfg = config::load_config();
    cfg.appearance
}

#[tauri::command]
fn get_full_config() -> config::Config {
    config::load_config()
}

#[tauri::command]
fn save_appearance_config(background: Option<String>, theme: Option<String>) -> Result<(), String> {
    let mut cfg = config::load_config();
    cfg.appearance.background = background;
    if let Some(t) = theme {
        cfg.appearance.theme = t;
    }
    config::save_config(&cfg).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_project(path: String) -> Result<(), String> {
    let mut cfg = config::load_config();
    cfg.projects.registered.retain(|p| p != &path);
    config::save_config(&cfg).map_err(|e| e.to_string())
}

fn main() {
    let shared_state: SharedState = Arc::new(Mutex::new(ClaudyState::new()));
    let state_for_watcher = shared_state.clone();
    let state_for_ws = shared_state.clone();

    // Start tokio runtime for WebSocket server
    let ws_broadcaster: Arc<Mutex<Option<StateBroadcaster>>> = Arc::new(Mutex::new(None));
    let ws_broadcaster_for_setup = ws_broadcaster.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(shared_state)
        .invoke_handler(tauri::generate_handler![get_state, get_active_projects, send_notification, get_appearance_config, get_full_config, save_appearance_config, remove_project])
        .setup(move |app| {
            // Start WebSocket server in tokio runtime
            let state_for_ws_clone = state_for_ws.clone();
            let ws_broadcaster_clone = ws_broadcaster_for_setup.clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
                rt.block_on(async {
                    if let Some(broadcaster) = websocket::start_server(state_for_ws_clone).await {
                        *ws_broadcaster_clone.lock().unwrap() = Some(broadcaster);
                    }
                    // Keep runtime alive
                    loop {
                        tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
                    }
                });
            });
            // Setup tray
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show/Hide", true, None::<&str>)?;
            let config = MenuItem::with_id(app, "config", "Configuration", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &config, &quit])?;

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
                    "config" => {
                        // Check if config window already exists
                        if let Some(window) = app.get_webview_window("config") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            // Create new config window
                            let config_url = if cfg!(debug_assertions) {
                                "http://localhost:5173/config.html"
                            } else {
                                "config.html"
                            };

                            if let Ok(window) = tauri::WebviewWindowBuilder::new(
                                app,
                                "config",
                                tauri::WebviewUrl::App(config_url.into())
                            )
                            .title("Claudy Configuration")
                            .inner_size(400.0, 500.0)
                            .resizable(true)
                            .center()
                            .build() {
                                let _ = window.show();
                            }
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // Position window based on config
            if let Some(window) = app.get_webview_window("main") {
                let cfg = config::load_config();
                position_window(&window, &cfg);
            }

            // Start watcher for registered projects
            let state_clone = state_for_watcher.clone();
            let app_handle = app.handle().clone();
            let ws_broadcaster_for_watcher = ws_broadcaster.clone();

            std::thread::spawn(move || {
                let watcher_result = SessionWatcher::new(move |event| {
                    eprintln!("[Claudy] Processing event: {:?}", event);
                    let mut s = state_clone.lock().unwrap();
                    s.handle_event(event);
                    let current_state = s.current_state.clone();
                    let full_state = s.clone();
                    drop(s); // Release lock before emitting

                    // Emit event to Tauri frontend
                    eprintln!("[Claudy] Emitting state: {}", current_state);
                    if let Err(e) = app_handle.emit("claudy-state-change", &current_state) {
                        eprintln!("[Claudy] Emit error: {}", e);
                    }

                    // Broadcast to WebSocket clients
                    if let Some(ref broadcaster) = *ws_broadcaster_for_watcher.lock().unwrap() {
                        websocket::broadcast_state(broadcaster, &full_state);
                    }
                });

                match watcher_result {
                    Ok(mut watcher) => loop {
                        let cfg = config::load_config();
                        if let Err(e) = watcher.sync_projects(&cfg.projects.registered) {
                            eprintln!("Failed to sync watched projects: {}", e);
                        }

                        std::thread::sleep(std::time::Duration::from_secs(2));
                    },
                    Err(e) => {
                        eprintln!("Failed to create watcher: {}", e);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
