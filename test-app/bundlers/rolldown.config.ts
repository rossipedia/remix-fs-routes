import { defineConfig } from 'rolldown'
import remixFsRoutes from 'remix-fs-routes/rolldown'

import { fixtureEntry, pluginOptions } from './options.ts'

export default defineConfig({
  input: fixtureEntry,
  external: [/^node:/, /^remix\//],
  plugins: [remixFsRoutes(pluginOptions)],
  output: {
    file: 'dist/rolldown/bundle.mjs',
    format: 'esm',
  },
})
