import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createAppRouter } from '#/router.js'
import { href } from '#/routes.js'

describe('shared generated route modules', () => {
  it('serves the index and links through generated hrefs', async () => {
    let router = createAppRouter()
    let response = await router.fetch(new Request(`http://test${href('/')}`))
    let body = await response.text()

    assert.equal(response.status, 200)
    assert.match(body, /remix-fs-routes testbed/)
    assert.match(body, /data-rmx=/)
    assert.match(body, /prefers-color-scheme: dark/)
    assert.match(body, /color-scheme: light dark/)
  })

  it('provides typed dynamic parameters to route actions', async () => {
    let router = createAppRouter()
    let postHref = href('/posts/:slug', { slug: 'typed-routes' })
    let response = await router.fetch(new Request(`http://test${postHref}`))

    assert.equal(response.status, 200)
    assert.match(await response.text(), /Post: typed-routes/)
  })

  it('matches both forms of an optional segment', async () => {
    let router = createAppRouter()
    assert.equal(href('/(:lang/)hello'), '/hello')
    assert.equal(href('/(:lang/)hello', { lang: 'es' }), '/es/hello')
    let defaultResponse = await router.fetch(new Request(`http://test${href('/(:lang/)hello')}`))
    let spanishResponse = await router.fetch(
      new Request(`http://test${href('/(:lang/)hello', { lang: 'es' })}`),
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
