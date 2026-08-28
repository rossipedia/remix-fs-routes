import { defineConfig } from 'vite'
import remixFsRoutes from 'remix-fs-routes/vite'
import { rollupTestbedApp } from 'remix-fs-routes-testbed-bundlers-fixture/build'

import { fixtureEntry, pluginOptions } from '#fixture'

export default defineConfig({
  plugins: [rollupTestbedApp, remixFsRoutes(pluginOptions)],
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
