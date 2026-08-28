import { defineConfig } from 'rolldown'
import remixFsRoutes from 'remix-fs-routes/rolldown'
import { rollupTestbedApp } from 'remix-fs-routes-testbed-bundlers-fixture/build'

import { fixtureEntry, pluginOptions } from '#fixture'

export default defineConfig({
  input: fixtureEntry,
  external: [/^node:/, /^remix\//],
  plugins: [rollupTestbedApp, remixFsRoutes(pluginOptions)],
  output: {
    file: 'dist/bundle.mjs',
    format: 'esm',
  },
})
