import { defineConfig } from 'rolldown'
import remixFsRoutes from 'remix-fs-routes/rolldown'

import { fixtureEntry, pluginOptions } from '../shared/options.js'

export default defineConfig({
  input: fixtureEntry,
  external: [/^node:/, /^remix\//],
  plugins: [remixFsRoutes(pluginOptions)],
  output: {
    file: 'dist/bundle.mjs',
    format: 'esm',
  },
})
