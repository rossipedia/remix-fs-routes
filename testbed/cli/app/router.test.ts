import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createAppRouter } from './router.ts'
import { routes } from './routes.ts'

describe('CLI-generated route modules', () => {
  it('serves the index and links through generated hrefs', async () => {
    let router = createAppRouter()
    let response = await router.fetch(new Request(`http://test${routes._index.href()}`))

    assert.equal(response.status, 200)
    assert.match(await response.text(), /remix-fs-routes CLI testbed/)
  })

  it('provides typed dynamic parameters to route actions', async () => {
    let router = createAppRouter()
    let href = routes['posts.$slug'].href({ slug: 'typed-routes' })
    let response = await router.fetch(new Request(`http://test${href}`))

    assert.equal(response.status, 200)
    assert.match(await response.text(), /Post: typed-routes/)
  })

  it('matches both forms of an optional segment', async () => {
    let router = createAppRouter()
    assert.equal(routes['($lang).hello'].href(), '/hello')
    assert.equal(routes['($lang).hello'].href({ lang: 'es' }), '/es/hello')
    let defaultResponse = await router.fetch(
      new Request(`http://test${routes['($lang).hello'].href()}`),
    )
    let spanishResponse = await router.fetch(
      new Request(`http://test${routes['($lang).hello'].href({ lang: 'es' })}`),
    )

    assert.match(await defaultResponse.text(), /Hello \(default\)/)
    assert.match(await spanishResponse.text(), /Hello \(es\)/)
  })

  it('returns 404 for an unknown route', async () => {
    let router = createAppRouter()
    let response = await router.fetch(new Request('http://test/not-a-route'))

    assert.equal(response.status, 404)
  })
})
