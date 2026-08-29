import path from 'node:path'

import { defineConfig } from '@rspack/cli'
import remixFsRoutes from 'remix-fs-routes/rspack'

import { fixtureAppDirectory, fixtureEntry, pluginOptions } from './options.ts'

export default defineConfig({
  mode: 'production',
  target: 'node',
  entry: fixtureEntry,
  devtool: false,
  externalsType: 'module',
  externals: [
    ({ request }, callback) =>
      request?.startsWith('remix/') ? callback(undefined, request) : callback(),
  ],
  optimization: { minimize: false },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        include: fixtureAppDirectory,
        loader: 'builtin:swc-loader',
        options: {
          detectSyntax: 'auto',
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
      },
    ],
  },
  resolve: {
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
  },
  plugins: [remixFsRoutes(pluginOptions)],
  output: {
    path: path.resolve('dist/rspack'),
    filename: 'bundle.mjs',
    module: true,
    clean: true,
  },
})
