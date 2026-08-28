import { defineConfig } from '@farmfe/core'
import remixFsRoutes from 'remix-fs-routes/farm'

import { fixtureEntry, pluginOptions } from '../shared/options.js'

export default defineConfig({
  compilation: {
    input: { bundle: fixtureEntry },
    external: ['^remix/'],
    output: {
      path: 'dist',
      entryFilename: 'bundle.mjs',
      format: 'esm',
      targetEnv: 'node',
    },
  },
  plugins: [remixFsRoutes(pluginOptions)],
})
