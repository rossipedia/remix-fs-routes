import { createRouter } from 'remix/router'

import { controller } from './routes.controller.ts'
import { routes } from './routes.ts'

export function createAppRouter() {
  let router = createRouter()
  router.map(routes, controller)
  return router
}

export const router = createAppRouter()
