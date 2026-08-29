import { renderWith } from 'remix/middleware/render'
import { createRouter, type MiddlewareContext } from 'remix/router'

import { createRenderer } from '#/render.tsx'
import { routes } from '#/routes.ts'
import { controller } from '#/routes.controller.ts'

const render = renderWith(createRenderer)

export type AppContext = MiddlewareContext<[typeof render]>

declare module 'remix/router' {
  interface RouterTypes {
    context: AppContext
  }
}

export function createAppRouter() {
  let router = createRouter<AppContext>({ middleware: [render] })
  router.map(routes, controller)
  return router
}

export const router = createAppRouter()
