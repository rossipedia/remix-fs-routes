import remixFsRoutes from 'remix-fs-routes/rollup'
import { rollupTestbedApp } from 'remix-fs-routes-testbed-bundlers-fixture/build'

import { fixtureEntry, pluginOptions } from '#fixture'

export default {
  input: fixtureEntry,
  external: [/^node:/, /^remix\//],
  plugins: [rollupTestbedApp, remixFsRoutes(pluginOptions)],
  output: {
    file: 'dist/bundle.mjs',
    format: 'esm',
  },
}
