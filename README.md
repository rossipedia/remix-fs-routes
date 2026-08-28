# remix-fs-routes

File-system route modules for Remix 3. Route folder names use the flat-route grammar from
[`@react-router/fs-routes`](https://reactrouter.com/how-to/file-route-conventions), while handlers use
Remix actions and generated controllers.

The package provides a standalone CLI and an
[unplugin](https://unplugin.unjs.io/) with Vite, Rollup, Rolldown, webpack, Rspack, Rsbuild, esbuild,
Farm, and Bun adapters.

## Install

```sh
pnpm add remix-fs-routes
```

Remix 3 is an optional peer dependency so build-only packages may use the scanner and CLI.

## Route modules

Every endpoint is a direct child folder of `app/routes`. Its folder name defines the route ID and URL,
and its entrypoint is `route.js`, `route.jsx`, `route.ts`, or `route.tsx`. `index.*` is also accepted as
an entrypoint, although `route.*` is recommended. Other files in the folder are colocated support code.

```text
app/routes/
  _index/route.ts                 /
  about/route.ts                  /about
  blog.$slug/route.ts             /blog/:slug
  files.$/route.ts                /files/*
  ($lang).categories/route.ts     /categories or /:lang/categories
  concerts_.mine/route.ts         /concerts/mine
  sitemap[.]xml/route.ts          /sitemap.xml
```

Generation places a concrete `+route.ts` companion beside every authored route. The companion owns
the Remix route object and a strongly typed action factory, so authored modules do not repeat a route
identifier or type argument:

```ts
import { createAction } from './+route.ts'

export const action = createAction(({ params }) => {
  return new Response(`Post ${params.slug}`)
})
```

Middleware is inferred before the bound factory types the handler:

```ts
export const action = createAction({
  middleware: [requireUser],
})(async ({ params, get }) => {
  return new Response(params.slug)
})
```

The package-level `createAction<Route>(handler)`, curried action-object form, and
`createAction(route, action)` remain available for compatibility. A route may re-export `action`, but
every route must provide that named export.

Pathless segments may organize an endpoint, such as `_auth.login/route.ts` mapping to `/login`.
Standalone pathless folders are rejected because Remix's request router has no layout endpoint.
Likewise, `concerts` and `concerts._index` cannot coexist because both map to `/concerts`.

## CLI

Generate route companions, the route map, the controller, and virtual-module declarations:

```sh
pnpm exec remix-fs-routes generate
```

The default central outputs are `app/routes.ts` and `app/routes.controller.ts`. Wire them into the
application router:

```ts
import { createRouter } from 'remix/router'

import { controller } from './routes.controller.ts'
import { routes } from './routes.ts'

export const router = createRouter()
router.map(routes, controller)
```

Useful options:

```sh
remix-fs-routes generate --watch
remix-fs-routes generate --check
remix-fs-routes typegen
remix-fs-routes typegen --watch
remix-fs-routes generate --ignore '**/*.test.tsx'
remix-fs-routes generate --app src --root pages \
  --routes-output src/routes.ts \
  --controller-output src/routes.controller.ts
remix-fs-routes generate --routes-export appRoutes --controller-export appController
remix-fs-routes typegen --typegen-directory .cache/remix-routes
```

Watch mode starts observing the route root before its initial generation, coalesces bursts of file
events, and serializes writes. Convention errors are reported without stopping the watcher, so fixing
the route tree triggers a successful regeneration. The programmatic `watchRouteArtifacts()` API also
accepts `pollingIntervalMs` for CI or environments where native filesystem watchers are constrained.

`typegen` writes only declarations for the two central virtual module IDs. `--check` exits with status
1 when an expected artifact is stale or a generated orphan remains. Writes use a temporary file and
atomic rename. Stale `+route.ts` companions are removed only when they carry the remix-fs-routes
header; an authored file is never overwritten or removed.

Add generated artifacts to source control ignores:

```gitignore
.remix-fs-routes/
app/routes/**/+route.ts
```

Run generation before standalone TypeScript checks and builds.

## Unplugin

Plugins always write the same companions and central artifacts as the CLI:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import remixFsRoutes from 'remix-fs-routes/vite'

export default defineConfig({
  plugins: [
    remixFsRoutes({
      routesOutput: 'app/routes.ts',
      controllerOutput: 'app/routes.controller.ts',
    }),
  ],
})
```

Equivalent adapters are exported from `/rollup`, `/rolldown`, `/webpack`, `/rspack`, `/rsbuild`,
`/esbuild`, `/farm`, and `/bun`. Every adapter accepts `appDirectory`, `rootDirectory`,
`ignoredRouteFiles`, `routesOutput`, `controllerOutput`, `routesExportName`, and
`controllerExportName`, and `typegenDirectory`.

The plugin also exposes `virtual:remix-fs-routes/routes` and
`virtual:remix-fs-routes/controller`. Those modules compose the same physical route companions; the
plugin no longer has a `write: false` mode. Include `.remix-fs-routes/types/**/*` in TypeScript
projects that import the virtual module IDs so their generated declarations are visible to `tsc`.

Bundler watch and development modes need no additional plugin option. Route creation, updates, and
deletion regenerate physical artifacts through the common `watchChange`/rebuild lifecycle. Structural
changes reconcile companions and invalidate both central virtual modules; Vite also sends a full
reload after its module graph is invalidated.

Both virtual IDs are configurable with `routesVirtualModuleId` and `controllerVirtualModuleId`. The
raw factory is exported from `remix-fs-routes/unplugin` for custom integrations.

## Programmatic API

```ts
import {
  generateRouteArtifacts,
  scanRoutes,
  watchRouteArtifacts,
  writeRouteArtifacts,
} from 'remix-fs-routes'

let manifest = await scanRoutes({ ignoredRouteFiles: ['**/*.test.ts'] })
let generated = await generateRouteArtifacts()
await writeRouteArtifacts({ routesOutput: 'app/routes.ts' })
let watcher = await watchRouteArtifacts({ debounceMs: 30 })
// Later: await watcher.close()
```

`generated.artifacts` contains ordered `route-module`, `routes`, `controller`, and `virtual-types`
records with absolute output paths and source text. The scanner throws `RouteConventionError` for
malformed folder names, unsupported top-level files, pathless endpoints, entrypoint conflicts, and
duplicate URL patterns.

## Testbed

[`testbed/cli/`](./testbed/cli) is a runnable Remix 3 application for the standalone CLI. The other
workspaces under [`testbed/`](./testbed) build and execute the same virtual-route fixture through
every exported bundler adapter; see the [testbed matrix](./testbed/README.md) for commands.
