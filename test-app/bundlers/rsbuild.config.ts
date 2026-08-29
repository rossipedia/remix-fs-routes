import { defineConfig } from '@rsbuild/core'
import remixFsRoutes from 'remix-fs-routes/rsbuild'

import { fixtureEntry, pluginOptions } from './options.ts'

export default defineConfig({
  plugins: [remixFsRoutes(pluginOptions)],
  source: {
    entry: { bundle: fixtureEntry },
  },
  output: {
    target: 'node',
    distPath: { root: 'dist/rsbuild', js: '' },
    filename: { js: '[name].mjs' },
    filenameHash: false,
  },
  tools: {
    htmlPlugin: false,
    swc: {
      jsc: {
        transform: {
          react: {
            runtime: 'automatic',
            importSource: 'remix/ui',
            development: false,
            refresh: false,
          },
        },
      },
    },
    rspack(config) {
      config.externalsType = 'module'
      config.externals = [
        ({ request }, callback) =>
          request?.startsWith('remix/') ? callback(undefined, request) : callback(),
      ]
      config.output = { ...config.output, module: true }
      config.resolve = {
        ...config.resolve,
        extensionAlias: { ...config.resolve?.extensionAlias, '.js': ['.ts', '.tsx', '.js'] },
      }
    },
  },
})
