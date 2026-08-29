import path from 'node:path'

import remixFsRoutes from 'remix-fs-routes/webpack'

import { fixtureAppDirectory, fixtureEntry, pluginOptions } from './options.ts'

export default {
  mode: 'production',
  target: 'node20',
  entry: fixtureEntry,
  devtool: false,
  experiments: { outputModule: true, typescript: false },
  externalsType: 'module',
  externals: [
    ({ request }, callback) =>
      request?.startsWith('remix/') ? callback(null, request) : callback(),
  ],
  optimization: { minimize: false },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: fixtureAppDirectory,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
          onlyCompileBundledFiles: true,
          compilerOptions: { noEmit: false, rewriteRelativeImportExtensions: true },
        },
      },
    ],
  },
  resolve: {
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
  },
  plugins: [remixFsRoutes(pluginOptions)],
  output: {
    path: path.resolve('dist/webpack'),
    filename: 'bundle.mjs',
    module: true,
    clean: true,
  },
}
