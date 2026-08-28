import { defineConfig } from '@rsbuild/core'
import remixFsRoutes from 'remix-fs-routes/rsbuild'

import { fixtureAppDirectory, fixtureEntry, fixtureTsxLoader, pluginOptions } from '#fixture'

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
      config.resolve = {
        ...config.resolve,
        alias: { ...config.resolve?.alias, '#': fixtureAppDirectory },
        extensionAlias: { ...config.resolve?.extensionAlias, '.js': ['.ts', '.tsx', '.js'] },
      }
      config.module ??= { rules: [] }
      config.module.rules ??= []
      config.module.rules.push({
        test: /\.[jt]sx?$/,
        include: fixtureAppDirectory,
        use: fixtureTsxLoader,
      })
    },
  },
})
