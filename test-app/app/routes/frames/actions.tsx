import type { Middleware } from 'remix/router'

import { createAction, createController } from './+route.ts'

const markFrameRoutes: Middleware = async (_context, next) => {
  let response = await next()
  response.headers.set('x-route-controller', 'frames')
  return response
}

export let controller = createController({ middleware: [markFrameRoutes] })

export default createAction(() => new Response('Frame routes'))
