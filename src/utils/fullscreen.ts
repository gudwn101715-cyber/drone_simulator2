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

  const targets = [
    document.documentElement,
    document.body,
    document.getElementById('root')
  ].filter(Boolean) as any[];

  for (const el of targets) {
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' });
        return true;
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        return true;
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
        return true;
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
        return true;
      }
    } catch {
      // try next target
    }
  }

  // Scroll viewport to hide address bar if full-screen API is restricted in iframe/iOS
  try {
    window.scrollTo(0, 1);
  } catch {}

  return false;
}
