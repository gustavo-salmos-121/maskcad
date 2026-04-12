import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages: set base to '/REPO_NAME/'
// Example: if your repo is 'maskcad', use '/maskcad/'
// For custom domain or root pages, use '/'
export default defineConfig({
  plugins: [react()],
  base: '/',
})
