import type { Middleware } from 'remix/router'

import { createController } from './+controller.ts'

const markDetailRoutes: Middleware = async (_context, next) => {
  let response = await next()
  response.headers.set('x-route-controller-detail', 'frames.details')
  return response
}

export default createController({ middleware: [markDetailRoutes] })
