/**
 * Fullscreen & Immersive Mode Helper
 * Supports Fullscreen API across Mobile Chrome, Safari, Android Tablets, and standard desktop browsers.
 */

export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

export async function requestFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  if (isFullscreen()) return true;

  try {
    const docEl = document.documentElement as any;
    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen({ navigationUI: 'hide' });
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
    } else if (docEl.mozRequestFullScreen) {
      await docEl.mozRequestFullScreen();
    } else if (docEl.msRequestFullscreen) {
      await docEl.msRequestFullscreen();
    }
    return true;
  } catch (err) {
    console.warn('Fullscreen request was prevented or not permitted:', err);
    return false;
  }
}
