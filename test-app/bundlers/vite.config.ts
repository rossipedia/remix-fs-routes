import { defineConfig } from 'vite'
import remixFsRoutes from 'remix-fs-routes/vite'

import { fixtureEntry, pluginOptions } from './options.ts'

export default defineConfig({
  plugins: [remixFsRoutes(pluginOptions)],
  build: {
    emptyOutDir: true,
    outDir: 'dist/vite',
    ssr: fixtureEntry,
    rollupOptions: {
      external: [/^node:/, /^remix\//],
      output: { entryFileNames: 'bundle.mjs' },
    },
  },
})
