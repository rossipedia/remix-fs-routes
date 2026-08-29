import remixFsRoutes from 'remix-fs-routes/bun'

import { fixtureEntry, pluginOptions, resolveAppImport } from './options.ts'

const appImports = {
  name: 'app-imports',
  setup(build) {
    build.onResolve({ filter: /^#\// }, ({ path }) => ({ path: resolveAppImport(path) }))
  },
}

let result = await Bun.build({
  entrypoints: [fixtureEntry],
  outdir: 'dist/bun',
  naming: 'bundle.mjs',
  external: ['remix/*'],
  format: 'esm',
  jsx: { runtime: 'automatic', importSource: 'remix/ui' },
  target: 'node',
  plugins: [appImports, remixFsRoutes(pluginOptions)],
})

if (!result.success) {
  for (let log of result.logs) console.error(log)
  process.exitCode = 1
}
