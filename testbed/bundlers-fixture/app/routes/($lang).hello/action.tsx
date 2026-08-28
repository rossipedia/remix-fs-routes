import { page } from '#/actions/page.js'
import { href } from '#/routes.js'
import { createAction } from './+route.ts'

export default createAction(({ params, render }) => {
  let language = params.lang ?? 'default'
  return render(page(
    `Hello (${language})`,
    <>
      <p>The optional locale came from the <code>($lang).hello</code> route folder.</p>
      <p><a href={href('/')}>Back home</a></p>
    </>,
  ))
})
