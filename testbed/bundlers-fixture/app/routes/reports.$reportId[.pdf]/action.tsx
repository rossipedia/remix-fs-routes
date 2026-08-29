import { page } from '#/actions/page.js'
import { href } from '#/routes.js'
import { createAction } from './+route.ts'

export default createAction(({ params, render }) => {
  return render(
    page(
      `Report: ${params.reportId}.pdf`,
      <>
        <p>The filename suffix is an escaped literal in the route folder name.</p>
        <p>
          <a href={href('/')}>Back home</a>
        </p>
      </>,
    ),
  )
})
