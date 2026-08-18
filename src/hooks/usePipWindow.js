import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Owns a Document Picture-in-Picture window: the only way the web platform
 * hands out a real OS-level window that floats above every other application,
 * has no tab strip or address bar, and is dragged and resized by the window
 * manager itself. Everything else here — copying the page's styles across,
 * mirroring the theme attributes — exists because a PiP document starts
 * completely empty and shares nothing with the opener but JavaScript.
 */

export const pipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

/** Clone the opener's CSS into the PiP document. */
function adoptStyles(pip) {
  const head = pip.document.head;

  // Same-origin sheets can be read rule by rule; a cross-origin one (the
  // Google Fonts CSS) throws on .cssRules, so it gets re-linked by href and
  // fetched again inside the new document.
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
      const style = pip.document.createElement('style');
      style.textContent = css;
      head.appendChild(style);
    } catch {
      if (!sheet.href) continue;
      const link = pip.document.createElement('link');
      link.rel = 'stylesheet';
      if (sheet.media && sheet.media.mediaText) link.media = sheet.media.mediaText;
      link.href = sheet.href;
      head.appendChild(link);
    }
  }

  // Preconnects keep the re-fetched font files quick.
  for (const el of document.querySelectorAll('link[rel="preconnect"]')) {
    head.appendChild(el.cloneNode(true));
  }
}

/** The PiP document is its own <html>; the theme lives on that element. */
function mirrorRootAttrs(pip) {
  const src = document.documentElement;
  const dst = pip.document.documentElement;
  for (const name of ['data-mode', 'data-theme']) {
    const v = src.getAttribute(name);
    if (v == null) dst.removeAttribute(name);
    else dst.setAttribute(name, v);
  }
}

export function usePipWindow({ onClose } = {}) {
  const [pipWindow, setPipWindow] = useState(null);
  const winRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Distinguishes the user closing the floating window — which means "I'm done
  // with the widget" — from us closing it to move the widget somewhere else.
  const selfClosingRef = useRef(false);

  const open = useCallback(async ({ width = 268, height = 300 } = {}) => {
    if (!pipSupported) return null;
    let pip;
    try {
      // requestWindow needs the user activation from the click that called us,
      // so this must stay on the gesture's own task — no awaits before it.
      pip = await window.documentPictureInPicture.requestWindow({
        width: Math.round(width),
        height: Math.round(height),
        disallowReturnToOpener: true,
      });
    } catch {
      // Denied, or a window is already out. Caller falls back to the in-app card.
      return null;
    }

    adoptStyles(pip);
    mirrorRootAttrs(pip);
    pip.document.documentElement.classList.add('pip-root');
    pip.document.body.classList.add('pip-body');

    // pagehide fires whether the user closed the window or the opener did.
    pip.addEventListener('pagehide', () => {
      winRef.current = null;
      setPipWindow(null);
      const deliberate = selfClosingRef.current;
      selfClosingRef.current = false;
      if (!deliberate) closeRef.current?.();
    });

    winRef.current = pip;
    setPipWindow(pip);
    return pip;
  }, []);

  const close = useCallback(() => {
    const w = winRef.current;
    if (!w) return;
    selfClosingRef.current = true;
    winRef.current = null;
    setPipWindow(null);
    w.close();
  }, []);

  // Theme and mode change on the opener as the session cycles; keep the
  // floating window on the same palette.
  useEffect(() => {
    if (!pipWindow) return;
    mirrorRootAttrs(pipWindow);
    const obs = new MutationObserver(() => mirrorRootAttrs(pipWindow));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme'] });
    return () => obs.disconnect();
  }, [pipWindow]);

  // A reload or navigation of the opener orphans the PiP window; take it down.
  useEffect(() => {
    if (!pipWindow) return;
    const bye = () => pipWindow.close();
    window.addEventListener('pagehide', bye);
    return () => window.removeEventListener('pagehide', bye);
  }, [pipWindow]);

  return { pipWindow, open, close, supported: pipSupported };
}
