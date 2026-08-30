import type { Middleware } from 'remix/router'
import type { Handle } from 'remix/ui'
import { createAction, createController } from './+route.ts'

const markDetailRoutes: Middleware = async (_context, next) => {
  let response = await next()
  response.headers.set('x-route-controller-detail', 'frames.details')
  return response
}

export let controller = createController({ middleware: [markDetailRoutes] })

function RouteDetails(handle: Handle) {
  return () => (
    <p data-frame-src={handle.frame.src} data-top-frame-src={handle.frames.top.src}>
      Nested frame content
    </p>
  )
}

export default createAction(({ render }) => render(<RouteDetails />))
