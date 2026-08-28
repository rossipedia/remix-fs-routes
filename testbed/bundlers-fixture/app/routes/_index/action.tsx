import { page } from '#/actions/page.js'
import { href } from '#/routes.js'
import { createAction } from './+route.ts'

export default createAction(({ render }) => {
  return render(page(
    'remix-fs-routes testbed',
    <>
      <p>
        This route contract is shared by the standalone CLI and every bundler testbed.
      </p>
      <ul>
        <li><a href={href('/about')}>About the testbed</a></li>
        <li>
          <a href={href('/posts/:slug', { slug: 'hello-remix' })}>A dynamic post route</a>
        </li>
        <li><a href={href('/(:lang/)hello')}>Optional locale omitted</a></li>
        <li>
          <a href={href('/(:lang/)hello', { lang: 'es' })}>Optional locale supplied</a>
        </li>
      </ul>
    </>,
  ))
})
