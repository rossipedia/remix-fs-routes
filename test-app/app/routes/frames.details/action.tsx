import type { Handle } from 'remix/ui'
import { createAction } from './+route.ts'

function RouteDetails(handle: Handle) {
  return () => (
    <p data-frame-src={handle.frame.src} data-top-frame-src={handle.frames.top.src}>
      Nested frame content
    </p>
  )
}

export default createAction(({ render }) => render(<RouteDetails />))
