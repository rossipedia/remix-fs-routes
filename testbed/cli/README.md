# CLI testbed

This Remix 3 server exercises the standalone `remix-fs-routes` CLI. It does not load an unplugin
adapter. Its generation scripts point at the shared TSX application in `testbed/bundlers-fixture`,
which is also consumed by every bundler testbed.

From the repository root:

```sh
pnpm --filter remix-fs-routes-testbed-cli routes
pnpm --filter remix-fs-routes-testbed-cli routes:watch
pnpm --filter remix-fs-routes-testbed-cli typecheck
pnpm --filter remix-fs-routes-testbed-cli test
pnpm --filter remix-fs-routes-testbed-cli dev
```

The `routes` script scans `testbed/bundlers-fixture/app/routes/` and writes the shared `routes.ts`,
`routes.controller.ts`, and concrete `+route.ts` companions there. Route actions render `remix/ui`
component trees through the shared `Page` component and `remix/ui/server`. The CLI server imports
the physical router; bundler testbeds consume the same contract through virtual modules.
