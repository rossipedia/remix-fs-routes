import { href, routes } from 'virtual:remix-fs-routes/routes'

routes._index.href()
routes['about._index'].href()
routes['posts.$slug'].href({ slug: 'typed-virtual-route' })
routes['projects.$projectId.settings'].href({ projectId: 'route-lab' })
routes['reports.$reportId[.pdf]'].href({ reportId: 2026 })
href('/')
href('/about/')
href('/posts/:slug', { slug: 'typed-pattern' })
href('/projects/:projectId/settings', { projectId: 'route-lab' })
href('/reports/:reportId.pdf', { reportId: 2026 })

// @ts-expect-error The generated virtual route requires a slug parameter.
routes['posts.$slug'].href()
// @ts-expect-error The generated virtual route map has no unknown route.
routes.unknown.href()
// @ts-expect-error The generated href requires a slug parameter.
href('/posts/:slug')
// @ts-expect-error The generated href only accepts discovered route patterns.
href('/unknown')
