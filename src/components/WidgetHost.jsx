import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import MiniWidget from './MiniWidget';
import { usePipWindow } from '../hooks/usePipWindow';

const GEO_KEY = 'tempo-widget-geo';
const DEFAULT_GEO = { x: null, y: null, w: 268, h: 306 };
const MIN_W = 150;
const MIN_H = 108;
const MAX_W = 760;
const MAX_H = 760;
const EDGE = 10;

/** Apple's momentum projection — where a flick would come to rest. */
function project(velocity, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past an edge, instead of a hard stop. */
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function loadGeo() {
  try {
    const raw = window.localStorage?.getItem(GEO_KEY);
    if (!raw) return { ...DEFAULT_GEO };
    const g = JSON.parse(raw);
    return {
      x: typeof g.x === 'number' ? g.x : null,
      y: typeof g.y === 'number' ? g.y : null,
      w: clamp(typeof g.w === 'number' ? g.w : DEFAULT_GEO.w, MIN_W, MAX_W),
      h: clamp(typeof g.h === 'number' ? g.h : DEFAULT_GEO.h, MIN_H, MAX_H),
    };
  } catch {
    return { ...DEFAULT_GEO };
  }
}

function saveGeo(g) {
  try {
    window.localStorage?.setItem(GEO_KEY, JSON.stringify(g));
  } catch {
    /* private mode — the widget just forgets where it was */
  }
}

/**
 * Decides where the mini widget lives and, when it lives inside the app
 * window, makes it behave like a real window: grabbed anywhere, tracked 1:1,
 * thrown with momentum, resisted at the screen edges, resized from the corner.
 */
export default function WidgetHost({ tempo }) {
  const { widget, widgetPinned, mode, running, remainingMs, totalMs, currentTask, stats } = tempo;
  const reduced = useReducedMotion();

  const geo = useRef(loadGeo());
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const w = useMotionValue(geo.current.w);
  const h = useMotionValue(geo.current.h);
  const placedRef = useRef(false);

  const onPipClosed = useCallback(() => tempo.closeWidget(), [tempo]);
  const { pipWindow, open: openPip, close: closePip, supported: pipSupported } = usePipWindow({ onClose: onPipClosed });

  const wantsPip = widget && widgetPinned && pipSupported;
  const showsCard = widget && !wantsPip;

  // ---- Picture-in-Picture lifecycle -----------------------------------

  useEffect(() => {
    if (!wantsPip) {
      closePip();
      return;
    }
    if (pipWindow) return;
    let cancelled = false;
    // Runs in the same task as the click that set the state, so the transient
    // user activation requestWindow() needs is still live.
    openPip({ width: geo.current.w, height: geo.current.h }).then((win) => {
      if (!win) return;
      if (cancelled) {
        win.close();
        return;
      }
      // Remember whatever size the window manager settles on.
      win.addEventListener('resize', () => {
        geo.current = { ...geo.current, w: clamp(win.innerWidth, MIN_W, MAX_W), h: clamp(win.innerHeight, MIN_H, MAX_H) };
        saveGeo(geo.current);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [wantsPip, pipWindow, openPip, closePip]);

  // ---- In-app card: first placement, and staying on screen -------------

  const clampToViewport = useCallback(
    (px, py, pw, ph) => ({
      x: clamp(px, EDGE, Math.max(EDGE, window.innerWidth - pw - EDGE)),
      y: clamp(py, EDGE, Math.max(EDGE, window.innerHeight - ph - EDGE)),
    }),
    []
  );

  useEffect(() => {
    if (!showsCard) {
      placedRef.current = false;
      return;
    }
    if (placedRef.current) return;
    placedRef.current = true;
    const g = geo.current;
    const pw = clamp(g.w, MIN_W, Math.min(MAX_W, window.innerWidth - EDGE * 2));
    const ph = clamp(g.h, MIN_H, Math.min(MAX_H, window.innerHeight - EDGE * 2));
    // No remembered spot yet: bottom-right, where a desktop widget belongs.
    const startX = g.x ?? window.innerWidth - pw - 24;
    const startY = g.y ?? window.innerHeight - ph - 24;
    const p = clampToViewport(startX, startY, pw, ph);
    w.set(pw);
    h.set(ph);
    x.set(p.x);
    y.set(p.y);
    geo.current = { x: p.x, y: p.y, w: pw, h: ph };
  }, [showsCard, clampToViewport, w, h, x, y]);

  useEffect(() => {
    if (!showsCard) return;
    const onResize = () => {
      const pw = clamp(w.get(), MIN_W, Math.min(MAX_W, Math.max(MIN_W, window.innerWidth - EDGE * 2)));
      const ph = clamp(h.get(), MIN_H, Math.min(MAX_H, Math.max(MIN_H, window.innerHeight - EDGE * 2)));
      w.set(pw);
      h.set(ph);
      const p = clampToViewport(x.get(), y.get(), pw, ph);
      x.set(p.x);
      y.set(p.y);
      geo.current = { x: p.x, y: p.y, w: pw, h: ph };
      saveGeo(geo.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [showsCard, clampToViewport, w, h, x, y]);

  // ---- Drag ------------------------------------------------------------

  const dragRef = useRef(null);
  const cardRef = useRef(null);

  const onDragPointerDown = useCallback(
    (e) => {
      if (!showsCard) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      // Controls and the resize grip opt out; everything else is a handle.
      if (e.target.closest?.('[data-no-drag], button, input, textarea, select, a')) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      // Whatever is mid-flight stops here, at the value on screen.
      x.stop();
      y.stop();
      dragRef.current = {
        id: e.pointerId,
        // Respect where it was grabbed, not the card's centre.
        offX: e.clientX - x.get(),
        offY: e.clientY - y.get(),
        history: [{ t: performance.now(), x: e.clientX, y: e.clientY }],
      };
      cardRef.current?.classList.add('is-dragging');
    },
    [showsCard, x, y]
  );

  const onDragPointerMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d || d.id !== e.pointerId) return;
      const pw = w.get();
      const ph = h.get();
      const maxX = Math.max(EDGE, window.innerWidth - pw - EDGE);
      const maxY = Math.max(EDGE, window.innerHeight - ph - EDGE);
      const rawX = e.clientX - d.offX;
      const rawY = e.clientY - d.offY;
      // Past an edge the card keeps following, just less and less.
      const softX =
        rawX < EDGE ? EDGE + rubberband(rawX - EDGE, window.innerWidth)
        : rawX > maxX ? maxX + rubberband(rawX - maxX, window.innerWidth)
        : rawX;
      const softY =
        rawY < EDGE ? EDGE + rubberband(rawY - EDGE, window.innerHeight)
        : rawY > maxY ? maxY + rubberband(rawY - maxY, window.innerHeight)
        : rawY;
      x.set(softX);
      y.set(softY);
      d.history.push({ t: performance.now(), x: e.clientX, y: e.clientY });
      if (d.history.length > 6) d.history.shift();
    },
    [w, h, x, y]
  );

  const endDrag = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d || d.id !== e.pointerId) return;
      dragRef.current = null;
      cardRef.current?.classList.remove('is-dragging');

      const now = performance.now();
      const first = d.history.find((s) => now - s.t < 90) || d.history[0];
      const dt = Math.max(1, now - first.t);
      const vx = ((e.clientX - first.x) / dt) * 1000;
      const vy = ((e.clientY - first.y) / dt) * 1000;

      const pw = w.get();
      const ph = h.get();
      const maxX = Math.max(EDGE, window.innerWidth - pw - EDGE);
      const maxY = Math.max(EDGE, window.innerHeight - ph - EDGE);

      // Land where the throw was going, not where the finger left off.
      const targetX = clamp(x.get() + project(vx), EDGE, maxX);
      const targetY = clamp(y.get() + project(vy), EDGE, maxY);
      const flicked = Math.hypot(vx, vy) > 260;

      geo.current = { ...geo.current, x: targetX, y: targetY };
      saveGeo(geo.current);

      if (reduced) {
        x.set(targetX);
        y.set(targetY);
        return;
      }
      // X and Y get their own spring; one spring on the 2D distance desyncs
      // whenever the two axes carry different velocities. Release velocity is
      // handed straight over, so there is no seam where the drag ends.
      const opts = { type: 'spring', bounce: flicked ? 0.18 : 0, duration: 0.4 };
      animate(x, targetX, { ...opts, velocity: vx });
      animate(y, targetY, { ...opts, velocity: vy });
    },
    [reduced, w, h, x, y]
  );

  // ---- Resize ----------------------------------------------------------

  const resizeRef = useRef(null);

  const onResizePointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      resizeRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, sw: w.get(), sh: h.get() };
    },
    [w, h]
  );

  const onResizePointerMove = useCallback(
    (e) => {
      const r = resizeRef.current;
      if (!r || r.id !== e.pointerId) return;
      const maxW = Math.min(MAX_W, window.innerWidth - x.get() - EDGE);
      const maxH = Math.min(MAX_H, window.innerHeight - y.get() - EDGE);
      w.set(clamp(r.sw + (e.clientX - r.sx), MIN_W, Math.max(MIN_W, maxW)));
      h.set(clamp(r.sh + (e.clientY - r.sy), MIN_H, Math.max(MIN_H, maxH)));
    },
    [w, h, x, y]
  );

  const onResizePointerUp = useCallback(
    (e) => {
      const r = resizeRef.current;
      if (!r || r.id !== e.pointerId) return;
      resizeRef.current = null;
      geo.current = { ...geo.current, w: w.get(), h: h.get() };
      saveGeo(geo.current);
    },
    [w, h]
  );

  // ---- Shared props ----------------------------------------------------

  if (!widget) return null;

  const shared = {
    mode,
    running,
    remainingMs,
    totalMs,
    currentTask,
    todayFocusMin: stats.today.m || 0,
    weekFocusMin: stats.weekM || 0,
    canPin: pipSupported,
    onToggleRun: tempo.toggleRunFromWidget,
    onSkip: tempo.skip,
    onTogglePin: tempo.toggleWidgetPin,
    onClose: tempo.closeWidget,
  };

  if (wantsPip) {
    return pipWindow ? createPortal(<MiniWidget variant="pip" pinned {...shared} />, pipWindow.document.body) : null;
  }

  return (
    <motion.div
      ref={cardRef}
      className="widget-card"
      style={{ x, y, width: w, height: h }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', bounce: 0, duration: 0.4 }}
      onPointerMove={onDragPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <MiniWidget
        variant="floating"
        pinned={false}
        {...shared}
        onDragPointerDown={onDragPointerDown}
        onResizePointerDown={(e) => {
          onResizePointerDown(e);
          const el = e.currentTarget;
          const move = (ev) => onResizePointerMove(ev);
          const up = (ev) => {
            onResizePointerUp(ev);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
            el.removeEventListener('pointercancel', up);
          };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerup', up);
          el.addEventListener('pointercancel', up);
        }}
      />
    </motion.div>
  );
}
