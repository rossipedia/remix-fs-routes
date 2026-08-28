import { defineConfig } from '@rsbuild/core'
import remixFsRoutes from 'remix-fs-routes/rsbuild'

import { fixtureEntry, pluginOptions } from '../shared/options.js'

export default defineConfig({
  plugins: [remixFsRoutes(pluginOptions)],
  source: {
    entry: { bundle: fixtureEntry },
  },
  output: {
    target: 'node',
    distPath: { root: 'dist', js: '' },
    filename: { js: '[name].mjs' },
    filenameHash: false,
  },
  tools: {
    htmlPlugin: false,
    rspack(config) {
      config.experiments = { ...config.experiments, outputModule: true }
      config.externalsType = 'module'
      config.externals = [
        ({ request }, callback) =>
          request?.startsWith('remix/') ? callback(null, request) : callback(),
      ]
      config.output = { ...config.output, module: true }
    },
  },
})
