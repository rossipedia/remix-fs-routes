import { routes } from 'virtual:remix-fs-routes/routes'

routes._index.href()
routes['posts.$slug'].href({ slug: 'typed-virtual-route' })

// @ts-expect-error The generated virtual route requires a slug parameter.
routes['posts.$slug'].href()
// @ts-expect-error The generated virtual route map has no unknown route.
routes.unknown.href()
