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

const OVERLAY_POS_KEY = 'intodo_overlay_pos';

/** Save overlay window position to localStorage for persistence. */
export function saveOverlayPosition(x: number, y: number): void {
  localStorage.setItem(OVERLAY_POS_KEY, JSON.stringify({ x, y }));
}

/** Restore overlay window to last saved position. */
export async function restoreOverlayPosition(): Promise<void> {
  if (!isTauri()) return;
  const raw = localStorage.getItem(OVERLAY_POS_KEY);
  if (!raw) return;
  try {
    const { x, y } = JSON.parse(raw);
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const { PhysicalPosition } = await import('@tauri-apps/api/dpi');
    await getCurrentWindow().setPosition(new PhysicalPosition(x, y));
  } catch { /* non-fatal */ }
}

/**
 * Snap the overlay window to the nearest screen edge after a drag ends.
 * Saves the snapped position for next launch.
 */
export async function snapOverlayToEdge(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow, currentMonitor } = await import('@tauri-apps/api/window');
    const { PhysicalPosition } = await import('@tauri-apps/api/dpi');
    const win = getCurrentWindow();
    const [pos, size, monitor] = await Promise.all([
      win.outerPosition(),
      win.outerSize(),
      currentMonitor(),
    ]);
    if (!monitor) return;

    const sw = monitor.size.width;
    const sh = monitor.size.height;

    // Snap X to nearest edge (left or right), keep 12px margin
    const snapX = pos.x + size.width / 2 < sw / 2
      ? 12
      : sw - size.width - 12;

    // Clamp Y within screen bounds
    const snapY = Math.max(12, Math.min(sh - size.height - 12, pos.y));

    await win.setPosition(new PhysicalPosition(snapX, snapY));
    saveOverlayPosition(snapX, snapY);
  } catch { /* non-fatal */ }
}
