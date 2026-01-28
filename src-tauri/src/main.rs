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

use state::{ClaudyState, SharedState};
use watcher::SessionWatcher;
use window::position_window;

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

fn main() {
    let cfg = config::load_config();
    println!("Config loaded: {:?}", cfg);

    let shared_state: SharedState = Arc::new(Mutex::new(ClaudyState::new()));
    let state_for_watcher = shared_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(shared_state)
        .invoke_handler(tauri::generate_handler![get_state, get_active_projects, send_notification])
        .setup(move |app| {
            // Setup tray
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

            // Position window based on config
            if let Some(window) = app.get_webview_window("main") {
                let cfg = config::load_config();
                position_window(&window, &cfg);
            }

            // Start watcher for registered projects
            let cfg = config::load_config();
            let state_clone = state_for_watcher.clone();
            let app_handle = app.handle().clone();

            std::thread::spawn(move || {
                let watcher_result = SessionWatcher::new(move |event| {
                    println!("Claude event: {:?}", event);

                    let mut s = state_clone.lock().unwrap();
                    s.handle_event(event);
                    let current_state = s.current_state.clone();
                    drop(s); // Release lock before emitting

                    // Emit event to frontend
                    let _ = app_handle.emit("claudy-state-change", &current_state);
                });

                match watcher_result {
                    Ok(mut watcher) => {
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
                    }
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
