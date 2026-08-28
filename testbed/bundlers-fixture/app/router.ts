import { createRouter, type MiddlewareContext } from 'remix/router'

import { render } from '#/actions/render.js'
import { routes } from '#/routes.js'
import { controller } from '#/routes.controller.js'

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
