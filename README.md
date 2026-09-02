# remix-fs-routes

File-system route modules for Remix 3, available as a standalone CLI or plugins for Vite, Rollup,
Rolldown, webpack, Rspack, Rsbuild, esbuild, Farm, and Bun.

> [!NOTE]
>
> ### 🤖 LLM assistance disclaimer 🤖
>
> This project was developed with the assistance of OpenAI's Sol model.
> While I have been a rather vocal critic of the social, economic, environmental, and most importantly cognitive impacts of LLMs and companies/people/data centers that power them, and have avoided building anything substantial with them outside of work until now, I wanted to hold an informed opinion by actually using one for something substantial of my own.
>
> Does that make me somewhat hypocritical? Possibly. But it's a weird world. I'm still navigating my way through this mess, and sometimes a hypocrite is a person who's going through change.
>
> Do with that as you will. If you choose not to consume this package because of that, I understand (_believe me_, I do) and wish you well.
>
> The rest of this readme was produced via LLM. This note, however, is 100% my own words.

## Quickstart

Install the package:

```sh
pnpm add --save-dev remix-fs-routes
```

Create an `actions` module. Its folder name defines the URL:

```ts
// app/routes/posts.$slug/actions.ts
import { createAction } from './+route.ts'

export default createAction(({ params }) => {
  return new Response(`Post ${params.slug}`)
})
```

Add the plugin to your bundler config. For Vite:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import remixFsRoutes from 'remix-fs-routes/vite'

export default defineConfig({
  plugins: [remixFsRoutes()],
})
```

Register the generated routes with your Remix router:

```ts
import { createRouter } from 'remix/router'
import { registerRoutes } from 'virtual:remix-fs-routes/controller'

export const router = createRouter()
registerRoutes(router)
```

Include the generated declarations in `tsconfig.json`:

```json
{
  "include": ["app", ".remix-fs-routes/types/**/*"]
}
```

The plugin generates route companions and refreshes them during bundler watch or development mode.
For a bundler-free setup, run `remix-fs-routes generate` before typechecking or starting the app.

## Install

```sh
pnpm add --save-dev remix-fs-routes
```

`remix-fs-routes` is build-time tooling. Your generated application code depends only on Remix and
your own route modules.

## Create a route

Each endpoint is an `actions` module in a direct child folder of `app/routes`. The folder name
defines both the route ID and URL:

```text
app/routes/
  _index/actions.ts
  posts.$slug/actions.ts
```

The generated `+route.ts` companion provides a typed `createAction` factory:

```ts
// app/routes/posts.$slug/actions.ts
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

Use named exports to handle specific HTTP methods. The default export is the `ANY` fallback for
methods without a named handler:

```ts
export let get = createAction(({ params }) => {
  return new Response(`Post ${params.slug}`)
})

export let post = createAction(({ params }) => {
  return new Response(`Created ${params.slug}`, { status: 201 })
})

export default createAction(({ request }) => {
  return new Response(`Handled ${request.method}`)
})
```

Supported method exports are `get`, `head`, `post`, `put`, `patch`, `delete`, and `options`. Since
`delete` cannot be used as a JavaScript binding name, export it with an alias:

```ts
let remove = createAction(() => new Response(null, { status: 204 }))
export { remove as delete }
```

HTTP also defines `CONNECT` and `TRACE`, but the Fetch `Request` API and Remix router do not support
them. Exporting `connect` or `trace` produces a clear error when routes are registered instead of
silently ignoring the handler.

The default export is optional. A module with only named method handlers returns the router's normal
not-found response for other methods.

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

Import the generated registration function when creating your router:

```ts
import { createRouter } from 'remix/router'
import { registerRoutes } from 'virtual:remix-fs-routes/controller'

export const router = createRouter()
registerRoutes(router)
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

### Rollup sequencing

The Rollup adapter still performs route code generation and virtual-module resolution, but Rollup
does not transform TypeScript itself. If you use `@rollup/plugin-typescript`, generate the route
files before starting Rollup so that the TypeScript plugin includes them in its compiler program:

```sh
pnpm exec remix-fs-routes generate
pnpm exec rollup --config rollup.config.js
```

Keep `remix-fs-routes/rollup` before `@rollup/plugin-typescript` in the plugin list. Do not rely on
the adapter's in-build generation to make newly created `.ts` files visible to the TypeScript
plugin; after adding or removing routes, rerun `generate` and restart the Rollup process. Other
Rollup TypeScript transforms may not have this limitation.

If you want route generation integrated into the bundler lifecycle without this sequencing
constraint, prefer the `remix-fs-routes/rolldown` adapter.

Bundler watch and development modes automatically regenerate routes when files change.

## Use the CLI

Generate the route companions, route map, registration function, and virtual-module declarations:

```sh
pnpm exec remix-fs-routes generate
```

Import the physical outputs in your router:

```ts
import { createRouter } from 'remix/router'

import { registerRoutes } from './routes.controller.ts'

export const router = createRouter()
registerRoutes(router)
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
| `_auth.login`        | `/login`                           |
| `admin_.health`      | `/admin/health`                    |
| `[_auth].login`      | `/_auth/login`                     |

Route entrypoints may use any JavaScript or TypeScript extension: `.js`, `.jsx`, `.mjs`, `.cjs`,
`.ts`, `.tsx`, `.mts`, or `.cts`. `actions` modules may export method handlers, a default fallback,
or both.

`_index` as the final segment represents the trailing-slash variant of a URL. A leading underscore
makes a segment pathless, and a trailing underscore opts a route out of its matching logical
controller boundary. Escape an underscore with brackets when it should be literal.

### Logical controller hierarchy

Export a named `controller` from an `actions` module to apply middleware to that route and its
logical descendants:

```text
app/routes/
  admin/actions.ts
  admin.users/actions.ts
  admin.reports/actions.ts
```

The generated `+route.ts` provides both strongly typed factories:

```ts
import { requireUser } from '#/middleware/require-user.ts'
import { createAction, createController } from './+route.ts'

export let controller = createController({ middleware: [requireUser] })

export default createAction(({ get }) => {
  let user = get(requireUser)
  return new Response(`Hello ${user.name}`)
})
```

Nested controller middleware is composed from outermost to innermost. A trailing underscore opts
out of the matching boundary: `admin.users` inherits the controller exported by
`admin/actions.ts`, while `admin_.health` does not. This hierarchy affects controller organization
and request handling only; `remix-fs-routes` does not provide a nested UI or layout convention.

## Configuration

All configuration is optional. The following example shows every option with its default value:

```ts
remixFsRoutes({
  cwd: process.cwd(),
  appDirectory: 'app',
  rootDirectory: 'routes',
  ignoredRouteFiles: [],
  routesOutput: 'app/routes.ts',
  controllerOutput: 'app/routes.controller.ts',
  routesExportName: 'routes',
  controllerExportName: 'registerRoutes',
  typegenDirectory: '.remix-fs-routes/types',
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
