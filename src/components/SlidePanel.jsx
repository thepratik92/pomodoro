import { useLayoutEffect, useEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, animate } from 'motion/react';

// Apple's momentum projection (Designing Fluid Interfaces): where a flick
// would coast to, with exponential decay — not the physics-textbook form.
function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Progressive resistance past a boundary: the further past, the less it follows.
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

const DRAG_THRESHOLD_PX = 10;
const VELOCITY_WINDOW_MS = 120;
// Sheet spring, à la Apple (damping 1.0 / response ~0.3 → stiffness/damping):
const SETTLE_SPRING = { type: 'spring', stiffness: 440, damping: 42 };
// Release after a drag carried momentum, so a little bounce is earned:
const RELEASE_SPRING = { type: 'spring', stiffness: 440, damping: 36 };

/**
 * A side panel that springs open/closed and can be grabbed at any moment —
 * including mid-animation — dragged 1:1, and flicked shut. Velocity carries
 * from the finger into the spring; the close decision uses the projected
 * resting point, not the release point.
 */
export default function SlidePanel({ side, open, onClose, onProgress, ariaLabel, className, children }) {
  const ref = useRef(null);
  const dir = side === 'left' ? -1 : 1; // sign of the closed offset
  const x = useMotionValue(open ? 0 : dir * 360);
  const reduced = useReducedMotion();
  const drag = useRef(null);
  const closing = useRef(false);

  const width = () => (ref.current ? ref.current.offsetWidth + 12 : 360);

  useEffect(() => {
    if (!onProgress) return undefined;
    return x.on('change', (v) => onProgress(Math.max(0, 1 - Math.abs(v) / width())));
  }, [x, onProgress]);

  useLayoutEffect(() => {
    const target = open ? 0 : dir * width();
    if (closing.current) {
      // The release handler already launched this close with the finger's
      // velocity; don't restart the spring without it.
      closing.current = false;
      return;
    }
    if (reduced) {
      x.set(target);
      return;
    }
    animate(x, target, SETTLE_SPRING);
  }, [open, dir, reduced, x]);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      x0: x.get(),
      committed: false,
      hist: [[performance.now(), e.clientX]],
    };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (!d.committed) {
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      // Hysteresis: commit only on clear horizontal intent, so vertical
      // scrolling and plain clicks inside the panel stay untouched.
      if (Math.abs(dx) < DRAG_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
      d.committed = true;
      x.stop(); // grab mid-flight: track from the presentation value
      d.x0 = x.get();
      d.sx = e.clientX; // respect where the grab actually began
      try {
        ref.current.setPointerCapture(d.id);
      } catch {
        /* capture unavailable; tracking still works within bounds */
      }
    }
    const w = width();
    let nx = d.x0 + (e.clientX - d.sx);
    // Rubber-band past the open position; free toward closed.
    if (dir === -1) {
      if (nx > 0) nx = rubberband(nx, w);
      else if (nx < -w) nx = -w;
    } else {
      if (nx < 0) nx = rubberband(nx, w);
      else if (nx > w) nx = w;
    }
    const now = performance.now();
    d.hist.push([now, e.clientX]);
    while (d.hist.length > 2 && now - d.hist[0][0] > VELOCITY_WINDOW_MS) d.hist.shift();
    x.set(nx);
  };

  const settle = (velocity) => {
    const w = width();
    const projected = x.get() + project(velocity);
    const shouldClose = dir === -1 ? projected < -w / 2 : projected > w / 2;
    const spring = reduced ? { duration: 0.01 } : { ...RELEASE_SPRING, velocity };
    if (shouldClose && open) {
      closing.current = true;
      onClose();
    }
    animate(x, shouldClose ? dir * w : 0, spring);
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.committed) return;
    const now = performance.now();
    const [t0, x0] = d.hist[0];
    const dt = Math.max(1, now - t0);
    settle(((e.clientX - x0) / dt) * 1000);
  };

  const onPointerCancel = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (d.committed) settle(0);
  };

  return (
    <motion.aside
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={'panel ' + (side === 'left' ? 'panel--left' : 'panel--right') + (className ? ' ' + className : '')}
      style={{ x, touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {children}
    </motion.aside>
  );
}
