import { page } from '../../actions/page.tsx'
import { routes } from '../../routes.ts'
import { createAction } from './+route.ts'

export const action = createAction(({ params }) => {
  // @ts-expect-error The generated route type exposes only the slug parameter.
  void params.missing
  return page(
    `Post: ${params.slug}`,
    <>
      <p>
        The folder's <code>$slug</code> segment became a typed <code>:slug</code> parameter.
      </p>
      <p>
        <a href={routes._index.href()}>Back home</a>
      </p>
    </>,
  )
})
