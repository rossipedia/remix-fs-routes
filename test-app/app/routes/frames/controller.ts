import type { Middleware } from 'remix/router'

import { createController } from './+controller.ts'

const markFrameRoutes: Middleware = async (_context, next) => {
  let response = await next()
  response.headers.set('x-route-controller', 'frames')
  return response
}

export default createController({ middleware: [markFrameRoutes] })
