import { html } from 'remix/html-template'
import { createAction } from 'remix/router'

import { page } from '../../actions/page.ts'
import { routes } from '../../routes.ts'
import { route } from './+route.ts'

export const action = createAction(route, ({ params }) => {
  return page(
    `Post: ${params.slug}`,
    html`
      <p>The folder's <code>$slug</code> segment became a typed <code>:slug</code> parameter.</p>
      <p><a href="${routes._index.href()}">Back home</a></p>
    `,
  )
})
