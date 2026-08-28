# remix-fs-routes

File-system route modules for Remix 3. Route folder names use the flat-route grammar from
[`@react-router/fs-routes`](https://reactrouter.com/how-to/file-route-conventions), while handlers use
native Remix `createAction()` and `createController()` APIs.

The package provides a standalone CLI and an
[unplugin](https://unplugin.unjs.io/) with Vite, Rollup, Rolldown, webpack, Rspack, Rsbuild, esbuild,
Farm, and Bun adapters.

## Install

```sh
npm install remix-fs-routes
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

Generation adds a disposable `+route.ts` companion to each folder. It contains the generated route
identity, so authored modules all use the same import and never repeat their route ID:

```ts
import { createAction } from 'remix/router'

import { route } from './+route.ts'

export const action = createAction(route, ({ params }) => {
  return new Response(`Post ${params.slug}`)
})
```

`createAction()` preserves exact parameter inference and supports Remix action objects with local
middleware. A route may re-export `action`, but every route must provide that named export.

Pathless segments may organize an endpoint, such as `_auth.login/route.ts` mapping to `/login`.
Standalone pathless folders are rejected because Remix's request router has no layout endpoint.
Likewise, `concerts` and `concerts._index` cannot coexist because both map to `/concerts`.

## CLI

Generate the route map, controller, and companions:

```sh
npx remix-fs-routes generate
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
remix-fs-routes generate --ignore '**/*.test.tsx'
remix-fs-routes generate --app src --root pages \
  --routes-output src/routes.ts \
  --controller-output src/routes.controller.ts
remix-fs-routes generate --routes-export appRoutes --controller-export appController
```

Watch mode starts observing the route root before its initial generation, coalesces bursts of file
events, and serializes writes. Convention errors are reported without stopping the watcher, so fixing
the route tree triggers a successful regeneration. The programmatic `watchRouteArtifacts()` API also
accepts `pollingIntervalMs` for CI or environments where native filesystem watchers are constrained.

`--check` exits with status 1 when any expected artifact is stale or a generated orphan companion
remains. Writes use a temporary file and atomic rename. Stale companions are deleted only when they
carry the remix-fs-routes generated header, and an authored `+route.ts` is never overwritten.

Add generated companions to source control ignores:

```gitignore
app/routes/**/+route.ts
```

Run generation before standalone TypeScript checks and builds.

## Unplugin

Plugins write the same physical artifacts by default, preserving exact editor and `tsc` types:

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
`controllerExportName`.

The plugin also exposes `virtual:remix-fs-routes/routes` and
`virtual:remix-fs-routes/controller`. With `write: false`, it resolves each `./+route.ts` import to an
importer-specific virtual companion. Add `remix-fs-routes/virtual` to bundler type environments for
the broad central virtual-module declarations. Standalone `tsc` still requires physical companions.

Bundler watch and development modes need no additional plugin option. Route creation, updates, and
deletion regenerate physical artifacts through the common `watchChange`/rebuild lifecycle. Structural
changes invalidate both central virtual modules and any importer-specific companions; Vite also sends
a full reload after its module graph is invalidated.

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

`generated.artifacts` contains ordered `routes`, `controller`, and `companion` records with absolute
output paths and source text. The scanner throws `RouteConventionError` for malformed folder names,
unsupported top-level files, pathless endpoints, entrypoint conflicts, and duplicate URL patterns.

## Testbed

[`testbed/cli/`](./testbed/cli) is a runnable Remix 3 application for the standalone CLI. The other
workspaces under [`testbed/`](./testbed) build and execute the same virtual-route fixture through
every exported bundler adapter; see the [testbed matrix](./testbed/README.md) for commands.
