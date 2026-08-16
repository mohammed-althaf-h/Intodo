use tauri::{LogicalSize, Window};

#[tauri::command]
fn set_island_mode(window: Window, mini: bool, expanded: bool) -> Result<(), String> {
    if mini {
        let (width, height) = if expanded { (380.0, 480.0) } else { (64.0, 64.0) };
        let _ = window.set_always_on_top(true);
        let _ = window.set_decorations(false);
        let _ = window.set_size(LogicalSize::new(width, height));
    } else {
        let _ = window.set_always_on_top(false);
        let _ = window.set_decorations(true);
        let _ = window.set_size(LogicalSize::new(1080.0, 760.0));
        let _ = window.center();
    }
    Ok(())
}

#[tauri::command]
fn start_drag(window: Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            set_island_mode,
            start_drag,
            minimize_window,
            close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
