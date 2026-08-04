import { useEffect, useRef, useState } from 'react';
import { BUCKETS } from '../hooks/useTempo';
import './TaskPicker.css';

const BUCKET_LABELS = { today: 'TODAY', tomorrow: 'TOMORROW', someday: 'SOMEDAY' };

export default function TaskPicker({ open, intent, todos, currentTaskId, onPick, onAdd, onStartWithoutTask, onClose }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setText('');
      // Focus after the open transition has mounted the modal.
      const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (text.trim()) onAdd(text);
  };

  const sections = BUCKETS.map((b) => ({
    bucket: b,
    label: BUCKET_LABELS[b],
    items: todos.filter((t) => !t.done && (t.bucket || 'today') === b),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="picker-layer">
      <div className="picker-scrim" onClick={onClose}></div>
      <div role="dialog" aria-modal="true" aria-label="Select focus task" className="picker-card">
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
      </div>
    </div>
  );
}
