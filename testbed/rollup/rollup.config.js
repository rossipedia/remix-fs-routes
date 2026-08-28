import remixFsRoutes from 'remix-fs-routes/rollup'

import { fixtureEntry, pluginOptions } from '../shared/options.js'

export default {
  input: fixtureEntry,
  external: [/^node:/, /^remix\//],
  plugins: [remixFsRoutes(pluginOptions)],
  output: {
    file: 'dist/bundle.mjs',
    format: 'esm',
  },
}
