import { page } from '#/actions/page.js'
import { href } from '#/routes.js'
import { Frame } from 'remix/ui'
import { createAction } from './+route.ts'

export default createAction(({ render }) => {
  return render(
    page(
      'remix-fs-routes testbed',
      <>
        <p>This route contract is shared by the standalone CLI and every bundler testbed.</p>
        <ul>
          <li>
            <a href={href('/about')}>About the testbed</a>
          </li>
          <li>
            <a href={href('/about/')}>Distinct trailing-slash route</a>
          </li>
          <li>
            <a href={href('/posts/:slug', { slug: 'hello-remix' })}>A dynamic post route</a>
          </li>
          <li>
            <a href={href('/(:lang/)hello')}>Optional locale omitted</a>
          </li>
          <li>
            <a href={href('/(:lang/)hello', { lang: 'es' })}>Optional locale supplied</a>
          </li>
          <li>
            <a href={href('/projects/:projectId/settings', { projectId: 'route-lab' })}>
              Deep dynamic route
            </a>
          </li>
          <li>
            <a href={href('/reports/:reportId.pdf', { reportId: 2026 })}>
              Dynamic route with a literal suffix
            </a>
          </li>
          <li>
            <a href="/files/guides/remix/routing">Catch-all file route</a>
          </li>
        </ul>
        <Frame
          name="summary"
          src={href('/frames/summary')}
          fallback={<p data-frame-fallback="">Loading route summary…</p>}
        />
      </>,
    ),
  )
})
