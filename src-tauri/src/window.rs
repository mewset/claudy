use tauri::{LogicalPosition, WebviewWindow};
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
        println!("Window positioned at ({}, {}) with anchor {}", x, y, config.position.anchor);
    }
}
