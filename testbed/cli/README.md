# CLI testbed

This Remix 3 app exercises the standalone `remix-fs-routes` CLI. It does not load an unplugin adapter.

From the repository root:

```sh
pnpm --filter remix-fs-routes-testbed-cli routes
pnpm --filter remix-fs-routes-testbed-cli routes:watch
pnpm --filter remix-fs-routes-testbed-cli typecheck
pnpm --filter remix-fs-routes-testbed-cli test
pnpm --filter remix-fs-routes-testbed-cli dev
```

The `routes` script scans the endpoint folders in `app/routes/` and generates `app/routes.ts`,
`app/routes.controller.ts`, and a concrete `+route.ts` companion beside every authored route. Each
authored `action.tsx` imports the route-bound `createAction` factory from its companion; the generated
route map and controller assemble the companion routes and authored actions. Route actions render
`remix/ui` component trees through the shared `Page` component and `remix/ui/server`.
