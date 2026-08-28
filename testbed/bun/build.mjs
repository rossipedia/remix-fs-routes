import remixFsRoutes from 'remix-fs-routes/bun'

import { buildAppImports, fixtureEntry, pluginOptions } from '#fixture'

let result = await Bun.build({
  entrypoints: [fixtureEntry],
  outdir: 'dist',
  naming: 'bundle.mjs',
  external: ['remix/*'],
  format: 'esm',
  jsx: { runtime: 'automatic', importSource: 'remix/ui' },
  target: 'node',
  plugins: [buildAppImports, remixFsRoutes(pluginOptions)],
})

if (!result.success) {
  for (let log of result.logs) console.error(log)
  process.exitCode = 1
}
