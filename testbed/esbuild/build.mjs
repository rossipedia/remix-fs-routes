import { build } from 'esbuild'
import remixFsRoutes from 'remix-fs-routes/esbuild'

import { fixtureEntry, pluginOptions } from '../bundlers-fixture/options.js'

await build({
  entryPoints: [fixtureEntry],
  outfile: 'dist/bundle.mjs',
  bundle: true,
  external: ['remix/*'],
  format: 'esm',
  platform: 'node',
  plugins: [remixFsRoutes(pluginOptions)],
})
