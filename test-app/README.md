# Testbed

`test-app` is a single Remix 3 application that exercises the standalone CLI and every exported
unplugin adapter. All integrations consume the same TSX route tree, Remix UI renderer, generated
route contract, and runtime assertions.

Each bundler keeps its native configuration in `bundlers/` and writes to its own output directory:

| Integration | Configuration or build script | Output                             |
| ----------- | ----------------------------- | ---------------------------------- |
| CLI         | `package.json`                | Physical generated files in `app/` |
| Vite        | `bundlers/vite.config.ts`     | `dist/vite/`                       |
| Rollup      | `bundlers/rollup.config.js`   | `dist/rollup/`                     |
| Rolldown    | `bundlers/rolldown.config.ts` | `dist/rolldown/`                   |
| webpack     | `bundlers/webpack.config.js`  | `dist/webpack/`                    |
| Rspack      | `bundlers/rspack.config.ts`   | `dist/rspack/`                     |
| Rsbuild     | `bundlers/rsbuild.config.ts`  | `dist/rsbuild/`                    |
| esbuild     | `bundlers/build.esbuild.mjs`  | `dist/esbuild/`                    |
| Farm        | `bundlers/farm.config.ts`     | `dist/farm/`                       |
| Bun         | `bundlers/build.bun.mjs`      | `dist/bun/`                        |

The CLI server imports the physical router. Bundler entry points import the controller and route map
through the default virtual module IDs. The shared renderer uses `remix/middleware/render` with
`renderToStream`; the routes exercise frame rendering, streaming, request cancellation, dynamic and
optional parameters, a catch-all, deep paths, trailing-slash indexes, and escaped literal suffixes.

Each bundler uses its standard TypeScript and JSX pipeline: webpack uses `ts-loader`, Rspack uses
`builtin:swc-loader`, and Rsbuild configures its built-in SWC transform. Typechecking remains a
separate `tsc --noEmit` step, and every JSX transform targets the `remix/ui` automatic runtime.
Bundlers with built-in TypeScript config loading use `.ts` configs. Rollup and webpack keep
JavaScript configs because their installed CLIs require additional config transpilers for TypeScript.

Run the complete app and bundler matrix from the repository root:

```sh
pnpm check:testbeds
```

Run an individual integration through the one testbed workspace:

```sh
pnpm --filter remix-fs-routes-testbed-app routes
pnpm --filter remix-fs-routes-testbed-app routes:watch
pnpm --filter remix-fs-routes-testbed-app dev
pnpm --filter remix-fs-routes-testbed-app check:vite
pnpm --filter remix-fs-routes-testbed-app check:webpack
```

The Bun check uses the installed `bun` executable to build, then executes the result with Node. If
Bun is unavailable, that integration reports a skip while the rest of the matrix continues.
