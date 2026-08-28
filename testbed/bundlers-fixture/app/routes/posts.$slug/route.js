import { createAction } from './+route.ts'

export const action = createAction(({ params }) => new Response(`post ${params.slug}`))
