import { html } from 'remix/html-template'
import { createAction } from 'remix/router'

import { page } from '../../actions/page.ts'
import { routes } from '../../routes.ts'
import { route } from './+route.ts'

export const action = createAction(route, () => {
  return page(
    'remix-fs-routes CLI testbed',
    html`
      <p>This route contract was generated from folders in <code>app/routes</code>.</p>
      <ul>
        <li><a href="${routes.about.href()}">About the testbed</a></li>
        <li>
          <a href="${routes['posts.$slug'].href({ slug: 'hello-remix' })}">
            A dynamic post route
          </a>
        </li>
        <li><a href="${routes['($lang).hello'].href()}">Optional locale omitted</a></li>
        <li>
          <a href="${routes['($lang).hello'].href({ lang: 'es' })}">
            Optional locale supplied
          </a>
        </li>
      </ul>
    `,
  )
})
