import { defineConfig, type Connect } from 'vite'
import vue from '@vitejs/plugin-vue'
import glsl from 'vite-plugin-glsl'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Serve the static prep course (public/learn/index.html) at /learn and /learn/
// in dev and preview, so it does not fall through to the Vue SPA index.html.
function serveLearn() {
  const file = resolve(__dirname, 'public/learn/index.html')
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url || '').split('?')[0]
    if (url === '/learn' || url === '/learn/') {
      res.setHeader('Content-Type', 'text/html')
      res.end(readFileSync(file))
      return
    }
    next()
  }
  return {
    name: 'serve-learn',
    configureServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig({
  plugins: [vue(), glsl(), serveLearn()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
