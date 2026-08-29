import { page } from '#/actions/page.tsx'
import { href } from '#/routes.ts'
import { createAction } from './+route.ts'

export default createAction(({ params, render }) => {
  // @ts-expect-error params is typed based on the route folder path
  void params.missing

  return render(
    page(
      `Post: ${params.slug}`,
      <>
        <p>This is a post with slug {params.slug}</p>
        <p>
          <a href={href('/')}>Back home</a>
        </p>
      </>,
    ),
  )
})
