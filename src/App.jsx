import { Component, lazy, Suspense, useEffect, useState } from 'react';
import { THEME_COLOR, useTempo } from './hooks/useTempo';
import { cockpitAvailable, useUiVariant } from './hooks/useUiVariant';
import ClassicApp from './ClassicApp';

/* global __COCKPIT_BETA__ */

// The cockpit beta is its own chunk: someone on the classic interface never
// downloads it, and the Android build — where the flag is false — never
// bundles it.
const CockpitApp = __COCKPIT_BETA__ ? lazy(() => import('./cockpit/CockpitApp.jsx')) : null;

const COCKPIT_THEME_COLOR = { dark: '#0b0b0c', light: '#e4e4e1', sepia: '#cdb596' };

/**
 * A beta must never cost anyone the app. If the cockpit fails to load or
 * throws while drawing, this hands the screen back to the classic interface
 * instead of leaving a blank page, and says why in the console.
 */
class CockpitBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Cockpit beta failed — showing the classic interface instead.', error);
    this.props.onFail(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * One timer, two interfaces. useTempo lives here, above the choice of shell,
 * so switching between them mid-session never touches the running clock.
 */
export default function App() {
  const tempo = useTempo();
  const [ui, setUi] = useUiVariant();
  const cockpit = cockpitAvailable && CockpitApp && ui === 'cockpit';

  const theme = tempo.settings.theme || 'dark';
  const mode = tempo.mode;
  // Declared after useTempo, so it runs after the effect in there that paints
  // the classic theme colour — and with the same dependencies, so it wins
  // every time rather than only on the first.
  useEffect(() => {
    const root = document.documentElement;
    if (cockpit) root.setAttribute('data-ui', 'cockpit');
    else root.removeAttribute('data-ui');
    const colors = cockpit ? COCKPIT_THEME_COLOR : THEME_COLOR;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', colors[theme] || colors.dark);
  }, [cockpit, theme, mode]);

  // Why the beta gave up, if it did — shown over the classic interface so a
  // failed switch does not look like a switch that simply did nothing.
  const [betaError, setBetaError] = useState(null);
  const onBetaFail = (error) => {
    setBetaError(String(error?.message || error || 'unknown error'));
    setUi('classic');
  };

  const uiProps = cockpitAvailable ? { ui, onSetUi: setUi } : {};

  if (cockpit) {
    return (
      // onFail switches the preference back, so the next render — and the
      // next visit — is the classic interface.
      <CockpitBoundary onFail={onBetaFail}>
        {/* The fallback is blank on purpose: the chunk is small and local, and
            a flash of the classic interface on the way in would be worse. */}
        <Suspense fallback={null}>
          <CockpitApp tempo={tempo} {...uiProps} />
        </Suspense>
      </CockpitBoundary>
    );
  }
  return (
    <>
      <ClassicApp tempo={tempo} {...uiProps} />
      {betaError && (
        <div className="beta-notice" role="alert">
          <div>
            <strong>The Cockpit beta could not start, so you are on the classic interface.</strong>
            <span>{betaError}</span>
          </div>
          <button type="button" onClick={() => setBetaError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </>
  );
}
