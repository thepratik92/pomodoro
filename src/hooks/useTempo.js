import { useEffect, useMemo, useReducer, useRef } from 'react';
import { dayKey, shiftDays } from '../utils/dateKeys';

const STORAGE_KEY = 'tempo-data';
const SAVE_DEBOUNCE_MS = 400;
const AUTO_START_DELAY_MS = 1400;
const NARROW_BREAKPOINT = 760;

const DEFAULT_SETTINGS = {
  focus: 25,
  short: 5,
  long: 15,
  laps: 4,
  autoStart: false,
  sound: true,
  theme: 'dark',
};

const STEPPER_DEFS = {
  focus: { step: 5, min: 5, max: 90 },
  short: { step: 1, min: 1, max: 30 },
  long: { step: 5, min: 5, max: 45 },
  laps: { step: 1, min: 2, max: 8 },
};

export const BUCKETS = ['today', 'tomorrow', 'someday'];

const initialState = {
  mode: 'focus',
  running: false,
  remaining: DEFAULT_SETTINGS.focus * 60000,
  focusInCycle: 0,
  panel: 'board',
  settings: DEFAULT_SETTINGS,
  todos: [],
  currentTaskId: null,
  // null | 'start' (picking before a stint starts) | 'switch' (changing task any time)
  picker: null,
  days: {},
  draft: '',
  sync: 'off',
  docked: false,
  narrow: typeof window !== 'undefined' ? window.innerWidth < NARROW_BREAKPOINT : false,
};

function patchReducer(state, patch) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  return { ...state, ...next };
}

function clampNum(v, a, b, fallback) {
  return typeof v === 'number' && isFinite(v) ? Math.min(b, Math.max(a, Math.round(v))) : fallback;
}

export function useTempo() {
  const [state, setState] = useReducer(patchReducer, initialState);

  const endAtRef = useRef(0);
  const autoTimerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const loadedRef = useRef(false);
  const mountedNarrowCheckedRef = useRef(false);

  const durMs = (mode) => state.settings[mode] * 60000;
  const remainingMs = state.running ? Math.max(0, endAtRef.current - Date.now()) : state.remaining;
  const totalMs = durMs(state.mode);

  const clearAuto = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const chime = (kind) => {
    if (!state.settings.sound) return;
    try {
      audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const notes = kind === 'focus' ? [659.25, 880] : [440, 659.25];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const t = now + i * 0.18;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + 1.05);
      });
    } catch {
      /* ignore: audio unsupported or blocked */
    }
  };

  const advance = (countIt) => {
    setState((s) => {
      let fic = s.focusInCycle;
      let days = s.days;
      let next;
      if (s.mode === 'focus') {
        if (countIt) {
          const k = dayKey();
          days = { ...s.days };
          const e = { ...(days[k] || { m: 0, s: 0 }) };
          e.m += s.settings.focus;
          e.s += 1;
          days[k] = e;
        }
        fic++;
        next = fic >= s.settings.laps ? 'long' : 'short';
      } else {
        if (s.mode === 'long') fic = 0;
        next = 'focus';
      }
      return { mode: next, focusInCycle: fic, days, running: false, remaining: s.settings[next] * 60000 };
    });
    if (state.settings.autoStart) {
      autoTimerRef.current = setTimeout(() => {
        autoTimerRef.current = null;
        startRun();
      }, AUTO_START_DELAY_MS);
    }
  };

  const complete = () => {
    chime(state.mode === 'focus' ? 'focus' : 'break');
    advance(true);
  };

  const startRun = () => {
    clearAuto();
    if (state.running) return;
    let rem = state.remaining;
    if (rem <= 0) rem = durMs(state.mode);
    endAtRef.current = Date.now() + rem;
    setState({ running: true, remaining: rem });
  };

  const pauseRun = () => {
    if (!state.running) return;
    setState({ running: false, remaining: Math.max(0, endAtRef.current - Date.now()) });
  };

  const currentTask = state.todos.find((t) => t.id === state.currentTaskId && !t.done) || null;

  const toggleRun = () => {
    if (state.running) {
      pauseRun();
      return;
    }
    // Starting a focus stint without a task on the board: ask what it's for.
    if (state.mode === 'focus' && !currentTask) {
      setState({ picker: 'start' });
      return;
    }
    startRun();
  };

  const openPicker = (intent) => setState({ picker: intent });
  const closePicker = () => setState({ picker: null });

  const pickTask = (id) => {
    const intent = state.picker;
    setState((s) => ({
      currentTaskId: id,
      picker: null,
      todos: s.todos.map((t) => (t.id === id ? { ...t, bucket: 'today' } : t)),
    }));
    if (intent === 'start') startRun();
  };

  const addTaskAndFocus = (text) => {
    text = (text || '').trim();
    if (!text) return;
    const id = Date.now() + '' + Math.floor(Math.random() * 1e4);
    const intent = state.picker;
    setState((s) => ({
      todos: [{ id, text, done: false, bucket: 'today' }, ...s.todos].slice(0, 80),
      currentTaskId: id,
      picker: null,
    }));
    if (intent === 'start') startRun();
  };

  const startWithoutTask = () => {
    setState({ picker: null, currentTaskId: null });
    startRun();
  };

  const reset = () => {
    clearAuto();
    setState({ running: false, remaining: durMs(state.mode) });
  };

  const skip = () => {
    clearAuto();
    advance(false);
  };

  const setMode = (m) => {
    clearAuto();
    setState({ mode: m, running: false, remaining: durMs(m) });
  };

  const setPanel = (panel) => setState({ panel });
  const closePanels = () => setState({ panel: null });
  const toggleDock = () => setState((s) => ({ docked: !s.docked }));

  const setDraft = (text) => setState({ draft: text });
  const addTodo = (bucket) => {
    const text = state.draft.trim();
    if (!text) return;
    const b = BUCKETS.includes(bucket) ? bucket : 'today';
    setState((s) => ({
      todos: [{ id: Date.now() + '' + Math.floor(Math.random() * 1e4), text, done: false, bucket: b }, ...s.todos].slice(0, 80),
      draft: '',
    }));
  };
  const toggleTodo = (id) =>
    setState((s) => {
      const todos = s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      const toggled = todos.find((t) => t.id === id);
      // Checking off the active task retires it from the dial.
      const currentTaskId = toggled && toggled.done && s.currentTaskId === id ? null : s.currentTaskId;
      return { todos, currentTaskId };
    });
  const delTodo = (id) =>
    setState((s) => ({
      todos: s.todos.filter((t) => t.id !== id),
      currentTaskId: s.currentTaskId === id ? null : s.currentTaskId,
    }));
  const clearDone = () => setState((s) => ({ todos: s.todos.filter((t) => !t.done) }));
  const moveTodo = (id) =>
    setState((s) => ({
      todos: s.todos.map((t) => {
        if (t.id !== id) return t;
        const cur = BUCKETS.indexOf(t.bucket || 'today');
        return { ...t, bucket: BUCKETS[(cur + 1) % BUCKETS.length] };
      }),
    }));

  const stepSetting = (key, dir) => {
    const def = STEPPER_DEFS[key];
    setState((s) => {
      const settings = { ...s.settings };
      settings[key] = Math.min(def.max, Math.max(def.min, settings[key] + def.step * dir));
      const patch = { settings };
      if (key === 'laps') {
        patch.focusInCycle = Math.min(s.focusInCycle, settings.laps - 1);
      } else if (key === s.mode && !s.running) {
        patch.remaining = settings[key] * 60000;
      }
      return patch;
    });
  };

  const toggleSetting = (key, val) =>
    setState((s) => ({ settings: { ...s.settings, [key]: val !== undefined ? val : !s.settings[key] } }));

  // Keep latest imperative handlers reachable from persistent listeners
  // (interval, keydown) without re-subscribing every render.
  const latestRef = useRef({});
  latestRef.current = { state, toggleRun, reset, skip, closePanels, closePicker, complete, endAtRef };

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', state.mode);
    document.documentElement.setAttribute('data-theme', state.settings.theme || 'dark');
  }, [state.mode, state.settings.theme]);

  useEffect(() => {
    const names = { focus: 'Focus', short: 'Short break', long: 'Long break' };
    const ms = state.running ? Math.max(0, endAtRef.current - Date.now()) : state.remaining;
    const t = Math.ceil(ms / 1000);
    document.title =
      String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0') + ' · ' + names[state.mode] + ' — TEMPO';
  });

  useEffect(() => {
    const onRes = () => setState({ narrow: window.innerWidth < NARROW_BREAKPOINT });
    window.addEventListener('resize', onRes);
    if (!mountedNarrowCheckedRef.current) {
      mountedNarrowCheckedRef.current = true;
      if (window.innerWidth < NARROW_BREAKPOINT) setState({ narrow: true, panel: null });
    }
    return () => window.removeEventListener('resize', onRes);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const l = latestRef.current;
      if (l.state.running) {
        if (Date.now() >= l.endAtRef.current) l.complete();
        else setState((s) => ({ ...s }));
      }
    }, 200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const keyH = (e) => {
      const l = latestRef.current;
      // Escape dismisses the top surface even while typing in it.
      if (e.key === 'Escape') {
        if (l.state.picker) l.closePicker();
        else l.closePanels();
        return;
      }
      if (e.target && e.target.closest && e.target.closest('button, input, textarea, select')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        l.toggleRun();
      } else if (e.key === 'r' || e.key === 'R') l.reset();
      else if (e.key === 's' || e.key === 'S') l.skip();
    };
    window.addEventListener('keydown', keyH);
    return () => window.removeEventListener('keydown', keyH);
  }, []);

  // Load persisted data once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
      const patch = { sync: window.localStorage ? 'local' : 'off' };
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          patch.days = p.days || {};
          patch.todos = Array.isArray(p.todos)
            ? p.todos.slice(0, 80).map((t) => ({ ...t, bucket: BUCKETS.includes(t.bucket) ? t.bucket : 'today' }))
            : [];
          patch.currentTaskId = typeof p.currentTaskId === 'string' ? p.currentTaskId : null;
          if (p.settings) {
            const s = { ...DEFAULT_SETTINGS };
            for (const k of Object.keys(s)) if (k in p.settings) s[k] = p.settings[k];
            s.focus = clampNum(s.focus, 5, 90, 25);
            s.short = clampNum(s.short, 1, 30, 5);
            s.long = clampNum(s.long, 5, 45, 15);
            s.laps = clampNum(s.laps, 2, 8, 4);
            s.autoStart = !!s.autoStart;
            s.sound = s.sound !== false;
            s.theme = ['dark', 'light', 'sepia'].includes(s.theme) ? s.theme : 'dark';
            patch.settings = s;
          }
        }
      }
      setState(patch);
      setState((s) => (s.running ? {} : { remaining: s.settings[s.mode] * 60000 }));
    } catch {
      setState({ sync: window.localStorage ? 'local' : 'off' });
    } finally {
      loadedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced persistence whenever meaningful data changes.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const payload = JSON.stringify({
          v: 2,
          days: state.days,
          todos: state.todos,
          settings: state.settings,
          currentTaskId: state.currentTaskId,
        });
        if (window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, payload);
          setState({ sync: 'local' });
        }
      } catch {
        setState({ sync: 'off' });
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.days, state.todos, state.settings, state.currentTaskId]);

  useEffect(() => clearAuto, []);

  const stats = useMemo(() => {
    const today = state.days[dayKey()] || { m: 0, s: 0 };
    let weekM = 0;
    let weekS = 0;
    for (let i = 0; i < 7; i++) {
      const e = state.days[dayKey(shiftDays(-i))];
      if (e) {
        weekM += e.m;
        weekS += e.s;
      }
    }
    let streak = 0;
    let i = (state.days[dayKey()] || {}).s > 0 ? 0 : -1;
    if (!(i === -1 && !((state.days[dayKey(shiftDays(-1))] || {}).s > 0))) {
      for (; ; i--) {
        const e = state.days[dayKey(shiftDays(i))];
        if (e && e.s > 0) streak++;
        else break;
      }
    }
    return { today, weekM, weekS, streak };
  }, [state.days]);

  return {
    ...state,
    remainingMs,
    totalMs,
    stepperDefs: STEPPER_DEFS,
    stats,
    currentTask,
    toggleRun,
    reset,
    skip,
    setMode,
    openBoard: () => setPanel('board'),
    openTelemetry: () => setPanel('telemetry'),
    openSetup: () => setPanel('setup'),
    closePanels,
    toggleDock,
    setDraft,
    addTodo,
    toggleTodo,
    delTodo,
    clearDone,
    moveTodo,
    stepSetting,
    toggleSetting,
    openPicker,
    closePicker,
    pickTask,
    addTaskAndFocus,
    startWithoutTask,
  };
}
