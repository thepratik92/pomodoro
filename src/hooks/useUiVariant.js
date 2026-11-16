import { useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/* global __COCKPIT_BETA__ */

/**
 * Which shell draws the app: the classic interface, or the cockpit beta.
 *
 * The beta is a web-only concept for now. Two gates keep it that way: the
 * build flag is false in the Android build (so the code is not even bundled
 * into the APK), and the runtime check covers a web bundle that somehow ends
 * up inside the native shell.
 *
 * The choice is deliberately a device-local preference rather than one of the
 * synced settings — the phone shares those, and it has no cockpit to show.
 */
export const cockpitAvailable = __COCKPIT_BETA__ && !Capacitor.isNativePlatform();

const KEY = 'tempo-ui';
const VARIANTS = ['classic', 'cockpit'];

function store(v) {
  try {
    window.localStorage?.setItem(KEY, v);
  } catch {
    /* private mode — the choice lasts for this visit only */
  }
}

function initial() {
  if (!cockpitAvailable) return 'classic';
  try {
    // ?ui=cockpit / ?ui=classic picks a shell from a link. It is consumed, so
    // a later change in Set-up is not undone by the next reload.
    const url = new URL(window.location.href);
    const asked = url.searchParams.get('ui');
    if (VARIANTS.includes(asked)) {
      store(asked);
      url.searchParams.delete('ui');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      return asked;
    }
    const saved = window.localStorage?.getItem(KEY);
    if (VARIANTS.includes(saved)) return saved;
  } catch {
    /* storage or history unavailable */
  }
  return 'classic';
}

export function useUiVariant() {
  const [ui, setUiState] = useState(initial);
  const setUi = useCallback((v) => {
    if (!cockpitAvailable || !VARIANTS.includes(v)) return;
    store(v);
    setUiState(v);
  }, []);
  return [ui, setUi];
}
