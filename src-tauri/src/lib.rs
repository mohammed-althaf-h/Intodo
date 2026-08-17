use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    LogicalSize, Manager, PhysicalPosition,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use std::sync::Mutex;

static SAVED_COLLAPSED_POS: Mutex<Option<(i32, i32)>> = Mutex::new(None);

// Invoked from overlay's "Open Board" button
#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

// Invoked from overlay when user opens / closes the AssistiveTouch panel
#[tauri::command]
fn set_overlay_size(app: tauri::AppHandle, collapsed: bool) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("overlay") {
        if collapsed {
            // Restore the exact position where the dot was before expanding
            if let Some((orig_x, orig_y)) = SAVED_COLLAPSED_POS.lock().unwrap().take() {
                let _ = win.set_position(PhysicalPosition::new(orig_x, orig_y));
            }
            let _ = win.set_size(LogicalSize::new(56.0, 56.0));
        } else {
            // Expanding: save the current dot position
            if let Ok(pos) = win.outer_position() {
                *SAVED_COLLAPSED_POS.lock().unwrap() = Some((pos.x, pos.y));
                
                // If dot is too close to right edge, shift window left so 296px panel fits on screen
                if let Ok(Some(monitor)) = win.current_monitor() {
                    let sw = monitor.size().width as i32;
                    let expanded_w = 296;
                    if pos.x + expanded_w > sw - 8 {
                        let new_x = (sw - expanded_w - 8).max(0);
                        let _ = win.set_position(PhysicalPosition::new(new_x, pos.y));
                    }
                }
            }
            let _ = win.set_size(LogicalSize::new(296.0, 360.0));
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![show_main_window, set_overlay_size])
        .setup(|app| {
            // --- Global hotkey: Ctrl+Shift+Space → bring main board to front ---
            let shortcut: Shortcut = "Ctrl+Shift+Space".parse().unwrap();
            let handle = app.handle().clone();
            let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _s, event| {
                if event.state() == ShortcutState::Pressed {
                    if let Some(win) = handle.get_webview_window("main") {
                        let _ = win.show();
                        let _ = win.unminimize();
                        let _ = win.set_always_on_top(true);
                        let _ = win.set_focus();
                        // lower back after focus so it doesn't stay on top of overlay
                        let _ = win.set_always_on_top(false);
                    }
                }
            });

            // --- System tray (Docker-like: always running) ---
            let show_board = MenuItem::with_id(app, "show_board", "Open Board", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Intodo", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_board, &quit])?;

            // Use a tiny 1x1 transparent image as the tray icon placeholder.
            // The app icon from tauri.conf.json icon list is used automatically
            // when a proper icon path is set. We generate a small RGBA image here
            // so it compiles without requiring an extra file path.
            let icon = Image::new(&[0u8, 0, 0, 128], 1, 1);

            TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Intodo — Click to open board")
                .icon(icon)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show_board" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            // --- Close main window → hide (don't quit) ---
            if let Some(main_win) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                main_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(win) = app_handle.get_webview_window("main") {
                            let _ = win.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
