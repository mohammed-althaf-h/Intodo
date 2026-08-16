/**
 * Tauri Window & Dynamic Island Native Bridge
 * Bridges browser mode & native Tauri desktop window APIs.
 */

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export async function setDesktopIslandMode(mini: boolean, expanded: boolean): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_island_mode', { mini, expanded });
    } catch (err) {
      console.warn('[WindowBridge] Tauri invoke error:', err);
    }
  }
}

export async function startDesktopDrag(): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('start_drag');
    } catch {
      // Fallback to JS drag
    }
  }
}

export async function minimizeDesktopWindow(): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('minimize_window');
    } catch (err) {
      console.warn('[WindowBridge] Minimize error:', err);
    }
  }
}

export async function closeDesktopWindow(): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('close_window');
    } catch (err) {
      console.warn('[WindowBridge] Close error:', err);
    }
  }
}
