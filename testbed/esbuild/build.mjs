import { build } from 'esbuild'
import remixFsRoutes from 'remix-fs-routes/esbuild'

import { buildAppImports, fixtureEntry, pluginOptions } from '#fixture'

await build({
  entryPoints: [fixtureEntry],
  outfile: 'dist/bundle.mjs',
  bundle: true,
  external: ['remix/*'],
  format: 'esm',
  jsx: 'automatic',
  jsxImportSource: 'remix/ui',
  platform: 'node',
  plugins: [buildAppImports, remixFsRoutes(pluginOptions)],
})
