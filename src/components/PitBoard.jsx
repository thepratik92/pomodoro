import './Panel.css';
import './PitBoard.css';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export default function PitBoard({ transform, draft, todos, onClose, onDraftChange, onAddTodo, onToggleTodo, onDeleteTodo, onClearDone }) {
  const hasDone = todos.some((t) => t.done);

  return (
    <aside role="dialog" aria-modal="true" aria-label="Pit board" className="panel panel--left" style={{ transform }}>
      <div className="panel-header">
        <div className="panel-title">PIT BOARD</div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close pit board">
          <CloseIcon />
        </button>
      </div>

      <div className="todo-input-row">
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAddTodo();
          }}
          maxLength={140}
          placeholder="Add to the board…"
          aria-label="New to-do"
          className="todo-input"
        />
        <button type="button" className="todo-add-btn" onClick={onAddTodo} aria-label="Add to-do">
          +
        </button>
      </div>

      <div className="todo-list">
        {todos.length === 0 && <div className="todo-empty">The board is clear. Add what the next stint is for.</div>}
        {todos.map((t) => (
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
              <svg viewBox="0 0 12 12" fill="none" stroke="#0B0B0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: t.done ? 1 : 0 }}>
                <polyline points="2 6.5 4.8 9 10 3"></polyline>
              </svg>
            </button>
            <span className="todo-text" style={{ color: t.done ? 'var(--t-faint)' : 'var(--t-text)', textDecoration: t.done ? 'line-through' : 'none' }}>
              {t.text}
            </span>
            <button type="button" className="todo-del" onClick={() => onDeleteTodo(t.id)} aria-label="Delete to-do">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {hasDone && (
        <button type="button" className="clear-done-btn" onClick={onClearDone}>
          CLEAR COMPLETED
        </button>
      )}
    </aside>
  );
}
