import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// The Android shell draws the page behind the system bars and pushes their size
// down as CSS variables. It also pushes on rotation and when the keyboard moves,
// but a page load can land after the first push, so ask once on startup too.
// Elsewhere the variables keep their env(safe-area-inset-*) defaults.
try {
  const raw = window.TempoSystemBars?.insets()
  if (raw) {
    const [top, right, bottom, left] = raw.split(',')
    const root = document.documentElement.style
    root.setProperty('--safe-top', top + 'px')
    root.setProperty('--safe-right', right + 'px')
    root.setProperty('--safe-bottom', bottom + 'px')
    root.setProperty('--safe-left', left + 'px')
  }
} catch {
  /* web build, or an older shell without the interface */
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
