import path from 'node:path'

import remixFsRoutes from 'remix-fs-routes/rspack'

import { fixtureAppDirectory, fixtureEntry, fixtureTsxLoader, pluginOptions } from '#fixture'

export default {
  mode: 'production',
  target: 'node',
  entry: fixtureEntry,
  devtool: false,
  experiments: { outputModule: true },
  externalsType: 'module',
  externals: [
    ({ request }, callback) =>
      request?.startsWith('remix/') ? callback(null, request) : callback(),
  ],
  optimization: { minimize: false },
  module: {
    rules: [{ test: /\.[jt]sx?$/, include: fixtureAppDirectory, use: fixtureTsxLoader }],
  },
  resolve: {
    alias: { '#': fixtureAppDirectory },
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
  },
  plugins: [remixFsRoutes(pluginOptions)],
  output: {
    path: path.resolve('dist'),
    filename: 'bundle.mjs',
    module: true,
    clean: true,
  },
}
