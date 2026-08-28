import path from 'node:path'

import remixFsRoutes from 'remix-fs-routes/rspack'

import { fixtureEntry, pluginOptions } from '../bundlers-fixture/options.js'

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
  plugins: [remixFsRoutes(pluginOptions)],
  output: {
    path: path.resolve('dist'),
    filename: 'bundle.mjs',
    module: true,
    clean: true,
  },
}
