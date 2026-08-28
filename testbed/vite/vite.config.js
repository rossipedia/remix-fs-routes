import { defineConfig } from 'vite'
import remixFsRoutes from 'remix-fs-routes/vite'

import { fixtureEntry, pluginOptions } from '../bundlers-fixture/options.js'

export default defineConfig({
  plugins: [remixFsRoutes(pluginOptions)],
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    ssr: fixtureEntry,
    rollupOptions: {
      external: [/^node:/, /^remix\//],
      output: { entryFileNames: 'bundle.mjs' },
    },
  },
})
