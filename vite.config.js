import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Serve from /pomodoro/ when built for GitHub Pages (set in the deploy workflow)
  base: process.env.GITHUB_PAGES ? '/pomodoro/' : '/',
})
