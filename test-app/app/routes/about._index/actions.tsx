import { page } from '#/actions/page.tsx'
import { href } from '#/routes.ts'
import { createAction } from './+route.ts'

export default createAction(({ render }) => {
  return render(
    page(
      'About (trailing slash)',
      <>
        <p>
          This action matches <code>/about/</code>, independently from <code>/about</code>.
        </p>
        <p>
          <a href={href('/about')}>Visit the route without a trailing slash</a>
        </p>
        <p>
          <a href={href('/')}>Back home</a>
        </p>
      </>,
    ),
  )
})
