import typescript from '@rollup/plugin-typescript'
import remixFsRoutes from 'remix-fs-routes/rollup'

import { fixtureEntry, pluginOptions } from './options.ts'

export default {
  input: fixtureEntry,
  external: [/^node:/, /^remix\//],
  onwarn(warning, warn) {
    // These source imports are bundled, so TypeScript never needs to rewrite them for emitted JS.
    if (warning.plugin === 'typescript' && warning.message.includes('TS2877')) return
    warn(warning)
  },
  plugins: [
    typescript({ compilerOptions: { rewriteRelativeImportExtensions: true } }),
    remixFsRoutes(pluginOptions),
  ],
  output: {
    file: 'dist/rollup/bundle.mjs',
    format: 'esm',
  },
}
