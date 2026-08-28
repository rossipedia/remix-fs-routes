import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/cli.ts',
    'src/unplugin.ts',
    'src/vite.ts',
    'src/rollup.ts',
    'src/rolldown.ts',
    'src/webpack.ts',
    'src/rspack.ts',
    'src/rsbuild.ts',
    'src/esbuild.ts',
    'src/farm.ts',
    'src/bun.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['remix/routes'],
})
