/**
 * windowBridge.ts — Tauri window label detection & inter-window commands
 */

export const isTauri = (): boolean =>
  typeof window !== 'undefined' &&
  ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

let _label: string | null = null;

/** Returns the Tauri window label, or 'browser' in dev/web mode. */
export async function getWindowLabel(): Promise<string> {
  if (_label !== null) return _label;
  if (!isTauri()) {
    _label = 'browser';
    return _label;
  }
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    _label = getCurrentWindow().label;
  } catch {
    _label = 'main';
  }
  return _label;
}

/** True only when running inside the dedicated overlay window. */
export async function isOverlayWindow(): Promise<boolean> {
  return (await getWindowLabel()) === 'overlay';
}

/** Tell Rust to show & focus the main board window. */
export async function showMainBoard(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('show_main_window');
  } catch (e) {
    console.warn('[windowBridge] show_main_window:', e);
  }
}

/** Tell Rust to resize the overlay window (collapsed pill vs expanded card). */
export async function setOverlaySize(collapsed: boolean): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_overlay_size', { collapsed });
  } catch (e) {
    console.warn('[windowBridge] set_overlay_size:', e);
  }
}
