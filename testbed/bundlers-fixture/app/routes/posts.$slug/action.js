import { createAction } from './+route.ts'

export default createAction(({ params }) => new Response(`post ${params.slug}`))
