# Testbeds

The repository contains one standalone CLI app and a build-and-run testbed for every exported
unplugin adapter.

| Workspace          | Integration under test                  |
| ------------------ | --------------------------------------- |
| `testbed/cli`      | Generated files from the standalone CLI |
| `testbed/vite`     | `remix-fs-routes/vite`                  |
| `testbed/rollup`   | `remix-fs-routes/rollup`                |
| `testbed/rolldown` | `remix-fs-routes/rolldown`              |
| `testbed/webpack`  | `remix-fs-routes/webpack`               |
| `testbed/rspack`   | `remix-fs-routes/rspack`                |
| `testbed/rsbuild`  | `remix-fs-routes/rsbuild`               |
| `testbed/esbuild`  | `remix-fs-routes/esbuild`               |
| `testbed/farm`     | `remix-fs-routes/farm`                  |
| `testbed/bun`      | `remix-fs-routes/bun`                   |

Every workspace shares the TSX route tree, Remix UI renderer, generated route contract, and runtime
assertions in `testbed/bundlers-fixture`. The CLI points the standalone generator at that fixture and
imports its physical router. Each plugin uses the same generation options while `app/entry.ts`
imports the controller and route map through the default virtual module IDs.

The shared renderer uses `remix/middleware/render` with `renderToStream`. Its fixture routes exercise
an immediate fallback, a streamed frame response, relative nested-frame resolution, request
cancellation, and preservation of the outer document URL across the frame tree.

The route tree also covers dynamic and optional parameters, a deep multi-segment route, a catch-all
segment, and an escaped literal suffix such as `:reportId.pdf`.

The build workspaces configure their native TSX pipeline for the shared `remix/ui` JSX runtime:
Bun and esbuild use automatic JSX settings, Farm uses its official JSX plugin, the webpack family
uses the shared TypeScript loader, and the Rollup family uses the shared transform plugin. These are
build-only differences; every integration executes the same authored route modules.

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
