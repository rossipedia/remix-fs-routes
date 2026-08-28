# CLI testbed

This Remix 3 app exercises the standalone `remix-fs-routes` CLI. It does not load an unplugin adapter.

From the repository root:

```sh
npm run routes --workspace remix-fs-routes-testbed-cli
npm run routes:watch --workspace remix-fs-routes-testbed-cli
npm run typecheck --workspace remix-fs-routes-testbed-cli
npm test --workspace remix-fs-routes-testbed-cli
npm run dev --workspace remix-fs-routes-testbed-cli
```

The `routes` script scans the endpoint folders in `app/routes/` and generates `app/routes.ts`,
`app/routes.controller.ts`, and a local `+route.ts` companion for each endpoint. Each authored
`route.ts` exports its own Remix `action`; the generated controller assembles those exports.
