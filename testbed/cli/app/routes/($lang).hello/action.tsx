import { page } from '../../actions/page.tsx'
import { routes } from '../../routes.ts'
import { createAction } from './+route.ts'

export default createAction(({ params }) => {
  let language = params.lang ?? 'default'
  return page(
    `Hello (${language})`,
    <>
      <p>
        The optional locale came from the <code>($lang).hello</code> route folder.
      </p>
      <p>
        <a href={routes._index.href()}>Back home</a>
      </p>
    </>,
  )
})
