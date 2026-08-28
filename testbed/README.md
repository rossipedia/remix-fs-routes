# Testbeds

The repository contains one standalone CLI app and a build-and-run testbed for every exported
unplugin adapter.

| Workspace | Integration under test |
| --- | --- |
| `testbed/cli` | Generated files from the standalone CLI |
| `testbed/vite` | `remix-fs-routes/vite` |
| `testbed/rollup` | `remix-fs-routes/rollup` |
| `testbed/rolldown` | `remix-fs-routes/rolldown` |
| `testbed/webpack` | `remix-fs-routes/webpack` |
| `testbed/rspack` | `remix-fs-routes/rspack` |
| `testbed/rsbuild` | `remix-fs-routes/rsbuild` |
| `testbed/esbuild` | `remix-fs-routes/esbuild` |
| `testbed/farm` | `remix-fs-routes/farm` |
| `testbed/bun` | `remix-fs-routes/bun` |

The bundler workspaces share the route tree and runtime assertions in `testbed/bundlers-fixture`.
Each plugin writes concrete route companions and central artifacts, while `app/entry.js` imports the
controller and route map through the default virtual module IDs. The fixture checks both an index
route and a dynamic `posts.$slug` route, including the route-bound action factory used by authored
modules.

Run the complete matrix from the repository root:

```sh
pnpm check:testbeds
```

Run one adapter by workspace name:

```sh
pnpm --filter remix-fs-routes-testbed-vite check
```

The Bun check uses the installed `bun` executable to build, then executes the result with Node. If
Bun is unavailable, that workspace reports a skip so the rest of the pnpm workspace matrix can run.
