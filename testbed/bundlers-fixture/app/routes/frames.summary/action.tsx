import type { Handle } from 'remix/ui'
import { Frame } from 'remix/ui'
import { createAction } from './+route.ts'

function RouteSummary(handle: Handle) {
  return () => (
    <section data-frame-src={handle.frame.src} data-top-frame-src={handle.frames.top.src}>
      <h2>Streamed route summary</h2>
      <Frame src="./details" />
    </section>
  )
}

export default createAction(({ render }) => render(<RouteSummary />))
