import remixFsRoutes from 'remix-fs-routes/rollup'

import { fixtureEntry, pluginOptions } from '../bundlers-fixture/options.js'

export default {
  input: fixtureEntry,
  external: [/^node:/, /^remix\//],
  plugins: [remixFsRoutes(pluginOptions)],
  output: {
    file: 'dist/bundle.mjs',
    format: 'esm',
  },
}
