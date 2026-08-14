import { useState } from 'react';
import { BUCKETS } from '../hooks/useTempo';
import SlidePanel from './SlidePanel';
import './Panel.css';
import './PitBoard.css';

const BUCKET_LABELS = { today: 'TODAY', tomorrow: 'TOMORROW', someday: 'SOMEDAY' };

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export default function PitBoard({
  open,
  onProgress,
  draft,
  todos,
  currentTaskId,
  onClose,
  onDraftChange,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onMoveTodo,
  onClearDone,
}) {
  const [addBucket, setAddBucket] = useState('today');
  const hasDone = todos.some((t) => t.done);

  const nextBucket = (b) => BUCKETS[(BUCKETS.indexOf(b) + 1) % BUCKETS.length];

  return (
    <SlidePanel side="left" open={open} onClose={onClose} onProgress={onProgress} ariaLabel="Pit board">
      <div className="panel-header">
        <div className="panel-title">PIT BOARD</div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close pit board">
          <CloseIcon />
        </button>
      </div>

      <div className="todo-add-block">
        <div className="todo-input-row">
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAddTodo(addBucket);
            }}
            maxLength={140}
            placeholder="Add to the board…"
            aria-label="New to-do"
            className="todo-input"
          />
          <button type="button" className="todo-add-btn" onClick={() => onAddTodo(addBucket)} aria-label="Add to-do">
            +
          </button>
        </div>
        <div className="bucket-chips" role="radiogroup" aria-label="Add to section">
          {BUCKETS.map((b) => (
            <button
              type="button"
              key={b}
              role="radio"
              aria-checked={addBucket === b}
              className={'bucket-chip' + (addBucket === b ? ' bucket-chip--on' : '')}
              onClick={() => setAddBucket(b)}
            >
              {BUCKET_LABELS[b]}
            </button>
          ))}
        </div>
      </div>

      <div className="todo-list">
        {todos.length === 0 && <div className="todo-empty">The board is clear. Add what the next stint is for.</div>}
        {BUCKETS.map((bucket) => {
          const items = todos.filter((t) => (t.bucket || 'today') === bucket);
          if (items.length === 0) return null;
          return (
            <div key={bucket} className="todo-section">
              <div className="todo-section-label">
                {BUCKET_LABELS[bucket]}
                <span className="todo-section-count">{items.filter((t) => !t.done).length}</span>
              </div>
              {items.map((t) => {
                const isCurrent = t.id === currentTaskId && !t.done;
                return (
                  <div key={t.id} className="todo-item">
                    <button
                      type="button"
                      className="todo-check"
                      style={{
                        background: t.done ? '#FF3B24' : 'none',
                        borderColor: t.done ? '#FF3B24' : 'var(--t-hair2)',
                        boxShadow: t.done ? '0 0 8px rgba(255,59,36,.4)' : 'none',
                      }}
                      onClick={() => onToggleTodo(t.id)}
                      aria-label="Toggle done"
                    >
                      <svg
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="#0B0B0E"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: t.done ? 1 : 0 }}
                      >
                        <polyline points="2 6.5 4.8 9 10 3"></polyline>
                      </svg>
                    </button>
                    {isCurrent && <span className="todo-current-dot" title="Current focus task"></span>}
                    <span
                      className="todo-text"
                      style={{
                        color: t.done ? 'var(--t-faint)' : isCurrent ? 'var(--accent)' : 'var(--t-text)',
                        textDecoration: t.done ? 'line-through' : 'none',
                      }}
                    >
                      {t.text}
                    </span>
                    <button
                      type="button"
                      className="todo-move"
                      onClick={() => onMoveTodo(t.id)}
                      aria-label={'Move to ' + BUCKET_LABELS[nextBucket(bucket)]}
                      title={'Move to ' + BUCKET_LABELS[nextBucket(bucket)].toLowerCase()}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </button>
                    <button type="button" className="todo-del" onClick={() => onDeleteTodo(t.id)} aria-label="Delete to-do">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {hasDone && (
        <button type="button" className="clear-done-btn" onClick={onClearDone}>
          CLEAR COMPLETED
        </button>
      )}
    </SlidePanel>
  );
}
