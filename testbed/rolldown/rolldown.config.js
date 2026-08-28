import { defineConfig } from 'rolldown'
import remixFsRoutes from 'remix-fs-routes/rolldown'

import { fixtureEntry, pluginOptions } from '../bundlers-fixture/options.js'

export default defineConfig({
  input: fixtureEntry,
  external: [/^node:/, /^remix\//],
  plugins: [remixFsRoutes(pluginOptions)],
  output: {
    file: 'dist/bundle.mjs',
    format: 'esm',
  },
})
