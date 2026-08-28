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

The bundler workspaces share the route tree and runtime assertions in `testbed/shared`. Each one
builds `app/entry.js` with `write: false`, imports the generated controller and route map through the
default virtual module IDs, then executes the bundle. The fixture checks both an index route and a
dynamic `posts.$slug` route, including their generated `./+route.js` companions.

Run the complete matrix from the repository root:

```sh
npm run check:testbeds
```

Run one adapter by workspace name:

```sh
npm run check --workspace remix-fs-routes-testbed-vite
```

The Bun check uses the installed `bun` executable to build, then executes the result with Node. If
Bun is unavailable, that workspace reports a skip so the rest of the npm workspace matrix can run.
