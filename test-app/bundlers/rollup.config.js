import typescript from '@rollup/plugin-typescript'
import remixFsRoutes from 'remix-fs-routes/rollup'

import { fixtureEntry, pluginOptions } from './options.ts'

export default {
  input: fixtureEntry,
  external: [/^node:/, /^remix\//],
  plugins: [
    typescript({ compilerOptions: { rewriteRelativeImportExtensions: true } }),
    remixFsRoutes(pluginOptions),
  ],
  output: {
    file: 'dist/rollup/bundle.mjs',
    format: 'esm',
  },
}
