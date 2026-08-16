/**
 * Tauri Window & Dynamic Island Bridge
 */

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export function setDesktopIslandMode(_mini: boolean, _expanded: boolean): void {
  // Graceful no-op in standard runtime
}

export function startDesktopDrag(): void {
  // Graceful fallback to CSS/JS drag
}
