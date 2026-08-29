import { page } from '#/actions/page.js'
import { href } from '#/routes.js'
import { createAction } from './+route.ts'

export default createAction(({ render, url }) => {
  let matchedPath = url.pathname.slice('/files/'.length)

  return render(
    page(
      'Catch-all file route',
      <>
        <p>
          Matched path: <code>{matchedPath}</code>
        </p>
        <p>
          <a href={href('/')}>Back home</a>
        </p>
      </>,
    ),
  )
})
