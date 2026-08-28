import { defineConfig } from '@farmfe/core'
import react from '@farmfe/plugin-react'
import remixFsRoutes from 'remix-fs-routes/farm'
import { farmAppImports } from 'remix-fs-routes-testbed-bundlers-fixture/build'

import { fixtureEntry, pluginOptions } from '#fixture'

export default defineConfig({
  compilation: {
    input: { bundle: fixtureEntry },
    external: ['^remix/'],
    persistentCache: false,
    output: {
      path: 'dist',
      entryFilename: 'bundle.mjs',
      format: 'esm',
      targetEnv: 'node',
    },
  },
  plugins: [
    farmAppImports,
    react({ runtime: 'automatic', importSource: 'remix/ui', refresh: false }),
    remixFsRoutes(pluginOptions),
  ],
})
