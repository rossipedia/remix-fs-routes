import { page } from '#/actions/page.js'
import { href } from '#/routes.js'
import { createAction } from './+route.ts'

export default createAction(({ params, render }) => {
  return render(
    page(
      `Project settings: ${params.projectId}`,
      <>
        <p>This route combines multiple static segments with a typed dynamic parameter.</p>
        <p>
          <a href={href('/')}>Back home</a>
        </p>
      </>,
    ),
  )
})
