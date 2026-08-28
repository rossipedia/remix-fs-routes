import { page } from '#/actions/page.js'
import { href } from '#/routes.js'
import { createAction } from './+route.ts'

export default createAction({ middleware: [] })(({ render }) => {
  return render(page(
    'About',
    <>
      <p>The CLI and bundler integrations consume the same generated route contract.</p>
      <p><a href={href('/')}>Back home</a></p>
    </>,
  ))
})
