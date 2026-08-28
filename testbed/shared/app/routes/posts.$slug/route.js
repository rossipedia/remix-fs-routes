import { createAction } from 'remix/router'

import { route } from './+route.js'

export const action = createAction(route, ({ params }) => new Response(`post ${params.slug}`))
