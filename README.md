# remix-fs-routes

File-system route modules for Remix 3, available as a standalone CLI or plugins for Vite, Rollup,
Rolldown, webpack, Rspack, Rsbuild, esbuild, Farm, and Bun.

## Install

```sh
pnpm add --save-dev remix-fs-routes
```

`remix-fs-routes` is build-time tooling. Your generated application code depends only on Remix and
your own route modules.

## Create a route

Each endpoint is an `action` module in a direct child folder of `app/routes`. The folder name defines
both the route ID and URL:

```text
app/routes/
  _index/action.ts
  posts.$slug/action.ts
```

The generated `+route.ts` companion provides a typed `createAction` factory:

```ts
// app/routes/posts.$slug/action.ts
import { createAction } from './+route.ts'

export default createAction(({ params }) => {
  return new Response(`Post ${params.slug}`)
})
```

Route middleware is inferred before the handler is typed:

```ts
export default createAction({
  middleware: [requireUser],
})(async ({ params, get }) => {
  return new Response(params.slug)
})
```

## Use a bundler plugin

Add the adapter to your bundler config. With Vite:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import remixFsRoutes from 'remix-fs-routes/vite'

export default defineConfig({
  plugins: [remixFsRoutes()],
})
```

Import the generated virtual route map and controller when creating your router:

```ts
import { createRouter } from 'remix/router'
import { controller } from 'virtual:remix-fs-routes/controller'
import { routes } from 'virtual:remix-fs-routes/routes'

export const router = createRouter()
router.map(routes, controller)
```

Include the generated declarations in your TypeScript project:

```json
{
  "include": ["app", ".remix-fs-routes/types/**/*"]
}
```

The other adapters use the same API:

| Bundler  | Import                     |
| -------- | -------------------------- |
| Rollup   | `remix-fs-routes/rollup`   |
| Rolldown | `remix-fs-routes/rolldown` |
| webpack  | `remix-fs-routes/webpack`  |
| Rspack   | `remix-fs-routes/rspack`   |
| Rsbuild  | `remix-fs-routes/rsbuild`  |
| esbuild  | `remix-fs-routes/esbuild`  |
| Farm     | `remix-fs-routes/farm`     |
| Bun      | `remix-fs-routes/bun`      |

Bundler watch and development modes automatically regenerate routes when files change.

## Use the CLI

Generate the route companions, route map, controller, and virtual-module declarations:

```sh
pnpm exec remix-fs-routes generate
```

Import the physical outputs in your router:

```ts
import { createRouter } from 'remix/router'

import { controller } from './routes.controller.ts'
import { routes } from './routes.ts'

export const router = createRouter()
router.map(routes, controller)
```

Common commands:

```sh
remix-fs-routes generate --watch
remix-fs-routes generate --check
remix-fs-routes typegen
```

Run `generate` before standalone TypeScript checks and builds. Use `--check` in CI to fail when
generated files are stale.

## Generate URLs

Both the physical and virtual route modules export a typed `href()` helper keyed by route pattern:

```ts
import { href } from './routes.ts'
// or: import { href } from 'virtual:remix-fs-routes/routes'

href('/')
href('/posts/:slug', { slug: 'hello-remix' })
href('/(:lang/)categories', { lang: 'es' })
```

## Route conventions

| Folder               | URL                                |
| -------------------- | ---------------------------------- |
| `_index`             | `/`                                |
| `about`              | `/about`                           |
| `about._index`       | `/about/`                          |
| `posts.$slug`        | `/posts/:slug`                     |
| `files.$`            | `/files/*`                         |
| `($lang).categories` | `/categories`, `/:lang/categories` |
| `reports.$id[.pdf]`  | `/reports/:id.pdf`                 |
| `sitemap[.]xml`      | `/sitemap.xml`                     |
| `_auth.login`        | `/_auth/login`                     |

Route entrypoints may use any JavaScript or TypeScript extension: `.js`, `.jsx`, `.mjs`, `.cjs`,
`.ts`, `.tsx`, `.mts`, or `.cts`. Each action module must provide a default export.

`_index` is the only special underscore name. As a final segment it represents the trailing-slash
variant of a URL. Other leading and trailing underscores are literal URL characters. Pathless and
nested-layout route conventions are not supported.

## Configuration

Configure plugins with the shared options:

```ts
remixFsRoutes({
  appDirectory: 'app',
  rootDirectory: 'routes',
  routesOutput: 'app/routes.ts',
  controllerOutput: 'app/routes.controller.ts',
  typegenDirectory: '.remix-fs-routes/types',
  ignoredRouteFiles: ['**/*.test.ts'],
})
```

Equivalent CLI flags are available alongside `--routes-export`, `--controller-export`, repeated
`--ignore` flags, and `--cwd`. Run `remix-fs-routes --help` for the complete list.

Add generated files to source control ignores:

```gitignore
.remix-fs-routes/
app/routes/**/+route.ts
```

## Programmatic API

```ts
import {
  generateRouteArtifacts,
  scanRoutes,
  watchRouteArtifacts,
  writeRouteArtifacts,
} from 'remix-fs-routes'
```

The raw unplugin factory is available from `remix-fs-routes/unplugin` for custom integrations.
