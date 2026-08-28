import { createAction } from 'remix/router'

import { route } from './+route.js'

export const action = createAction(route, () => new Response('bundler testbed index'))
