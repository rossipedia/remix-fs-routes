import { build } from 'esbuild'
import remixFsRoutes from 'remix-fs-routes/esbuild'

import { fixtureEntry, pluginOptions } from './options.ts'

await build({
  entryPoints: [fixtureEntry],
  outfile: 'dist/esbuild/bundle.mjs',
  bundle: true,
  external: ['remix/*'],
  format: 'esm',
  jsx: 'automatic',
  jsxImportSource: 'remix/ui',
  platform: 'node',
  plugins: [remixFsRoutes(pluginOptions)],
})
