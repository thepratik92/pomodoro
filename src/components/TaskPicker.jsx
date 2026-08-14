import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BUCKETS } from '../hooks/useTempo';
import './TaskPicker.css';

const BUCKET_LABELS = { today: 'TODAY', tomorrow: 'TOMORROW', someday: 'SOMEDAY' };

// Materialize (§12): blur, scale, and position settle together, and the exit
// retraces the entrance path (§7 spatial consistency).
const CARD_HIDDEN = { opacity: 0, y: 14, scale: 0.96, filter: 'blur(8px)' };
const CARD_SHOWN = { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' };
const CARD_SPRING = { type: 'spring', stiffness: 500, damping: 44 };

export default function TaskPicker({ open, intent, todos, currentTaskId, onPick, onAdd, onStartWithoutTask, onClose }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (open) {
      setText('');
      // Focus after the open transition has mounted the modal.
      const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  const submit = () => {
    if (text.trim()) onAdd(text);
  };

  const sections = BUCKETS.map((b) => ({
    bucket: b,
    label: BUCKET_LABELS[b],
    items: todos.filter((t) => !t.done && (t.bucket || 'today') === b),
  })).filter((s) => s.items.length > 0);

  return (
    <AnimatePresence>
      {open && (
    <div className="picker-layer">
      <motion.div
        className="picker-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
      ></motion.div>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Select focus task"
        className="picker-card"
        initial={reduced ? { opacity: 0 } : CARD_HIDDEN}
        animate={reduced ? { opacity: 1 } : CARD_SHOWN}
        exit={reduced ? { opacity: 0 } : CARD_HIDDEN}
        transition={reduced ? { duration: 0.15 } : CARD_SPRING}
      >
        <div className="picker-header">
          <div>
            <div className="picker-title">NEXT STINT</div>
            <div className="picker-subtitle">What are you working on?</div>
          </div>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Close task picker">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="picker-input-row">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            maxLength={140}
            placeholder="New task — added to Today…"
            aria-label="New focus task"
            className="todo-input"
          />
          <button type="button" className="todo-add-btn" onClick={submit} aria-label="Add and focus this task">
            +
          </button>
        </div>

        <div className="picker-list">
          {sections.length === 0 && <div className="todo-empty">The board is clear — type the task above to get rolling.</div>}
          {sections.map((sec) => (
            <div key={sec.bucket}>
              <div className="picker-section-label">{sec.label}</div>
              {sec.items.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={'picker-item' + (t.id === currentTaskId ? ' picker-item--current' : '')}
                  onClick={() => onPick(t.id)}
                >
                  <span className="picker-item-dot"></span>
                  <span className="picker-item-text">{t.text}</span>
                  {sec.bucket !== 'today' && <span className="picker-item-hint">→ TODAY</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {intent === 'start' && (
          <button type="button" className="picker-skip" onClick={onStartWithoutTask}>
            START WITHOUT TASK
          </button>
        )}
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
