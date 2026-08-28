import { html } from 'remix/html-template'
import { createAction } from 'remix/router'

import { page } from '../../actions/page.ts'
import { routes } from '../../routes.ts'
import { route } from './+route.ts'

export const action = createAction(route, ({ params }) => {
  let language = params.lang ?? 'default'
  return page(
    `Hello (${language})`,
    html`
      <p>The optional locale came from the <code>($lang).hello</code> route folder.</p>
      <p><a href="${routes._index.href()}">Back home</a></p>
    `,
  )
})
