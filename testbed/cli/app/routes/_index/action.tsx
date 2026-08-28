import { page } from '../../actions/page.tsx'
import { routes } from '../../routes.ts'
import { createAction } from './+route.ts'

export default createAction(() => {
  return page(
    'remix-fs-routes CLI testbed',
    <>
      <p>
        This route contract was generated from folders in <code>app/routes</code>.
      </p>
      <ul>
        <li>
          <a href={routes.about.href()}>About the testbed</a>
        </li>
        <li>
          <a href={routes['posts.$slug'].href({ slug: 'hello-remix' })}>
            A dynamic post route
          </a>
        </li>
        <li>
          <a href={routes['($lang).hello'].href()}>Optional locale omitted</a>
        </li>
        <li>
          <a href={routes['($lang).hello'].href({ lang: 'es' })}>
            Optional locale supplied
          </a>
        </li>
      </ul>
    </>,
  )
})
