import remixFsRoutes from 'remix-fs-routes/bun'

import { fixtureEntry, pluginOptions } from '../bundlers-fixture/options.js'

let result = await Bun.build({
  entrypoints: [fixtureEntry],
  outdir: 'dist',
  naming: 'bundle.mjs',
  external: ['remix/*'],
  format: 'esm',
  target: 'node',
  plugins: [remixFsRoutes(pluginOptions)],
})

if (!result.success) {
  for (let log of result.logs) console.error(log)
  process.exitCode = 1
}
