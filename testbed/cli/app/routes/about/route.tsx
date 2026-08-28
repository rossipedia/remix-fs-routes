import { page } from '../../actions/page.tsx'
import { routes } from '../../routes.ts'
import { createAction } from './+route.ts'

export const action = createAction({
  middleware: [],
})(() => {
  return page(
    'About',
    <>
      <p>The standalone CLI owns the route map, controller, and generated route companions.</p>
      <p>
        <a href={routes._index.href()}>Back home</a>
      </p>
    </>,
  )
})
