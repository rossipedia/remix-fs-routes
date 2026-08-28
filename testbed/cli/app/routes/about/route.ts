import { html } from 'remix/html-template'
import { createAction } from 'remix/router'

import { page } from '../../actions/page.ts'
import { routes } from '../../routes.ts'
import { route } from './+route.ts'

export const action = createAction(route, {
  middleware: [],
  handler() {
    return page(
      'About',
      html`
        <p>The standalone CLI owns the route map, controller, and route companions.</p>
        <p><a href="${routes._index.href()}">Back home</a></p>
      `,
    )
  },
})
