import { defineConfig, type JsPlugin } from '@farmfe/core'
import react from '@farmfe/plugin-react'
import remixFsRoutes from 'remix-fs-routes/farm'

import { fixtureEntry, pluginOptions, resolveAppImport } from './options.ts'

const appImports = {
  name: 'app-imports',
  priority: 1000,
  resolve: {
    filters: { importers: ['.*'], sources: ['^#/'] },
    executor({ source }) {
      let resolvedPath = resolveAppImport(source)
      return resolvedPath ? { resolvedPath } : null
    },
  },
} satisfies JsPlugin

export default defineConfig({
  compilation: {
    input: { bundle: fixtureEntry },
    external: ['^remix/'],
    persistentCache: false,
    output: {
      path: 'dist/farm',
      entryFilename: 'bundle.mjs',
      format: 'esm',
      targetEnv: 'node',
    },
  },
  plugins: [
    appImports,
    react({ runtime: 'automatic', importSource: 'remix/ui', refresh: false }),
    remixFsRoutes(pluginOptions),
  ],
})
