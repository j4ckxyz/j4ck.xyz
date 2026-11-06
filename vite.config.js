import { defineConfig } from 'vite'
import { renderPage, NOW_FILE, PROJECTS_FILE } from './scripts/render.mjs'

// Fills the build-time placeholders (see scripts/render.mjs) so every page
// ships as plain HTML with no client-side fetching. Runs before Vite's own
// HTML processing so the injected stylesheet link is bundled.
const pages = () => ({
  name: 'static-pages',
  transformIndexHtml: { order: 'pre', handler: renderPage },
  configureServer(server) {
    // Dev only: serve /projects, /now, /weeks like Cloudflare Pages does (clean URLs).
    server.middlewares.use((req, _res, next) => {
      const [path, query = ''] = req.url.split('?')
      if (['/projects', '/now', '/weeks', '/404'].includes(path)) req.url = `${path}.html${query ? `?${query}` : ''}`
      next()
    })
    const watched = [NOW_FILE, PROJECTS_FILE]
    server.watcher.add(watched)
    server.watcher.on('change', (file) => {
      if (watched.includes(file)) server.ws.send({ type: 'full-reload' })
    })
  },
})

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        projects: 'projects.html',
        now: 'now.html',
        weeks: 'weeks.html',
        notfound: '404.html',
      },
    },
  },
})
