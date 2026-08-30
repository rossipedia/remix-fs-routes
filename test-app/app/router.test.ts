import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { createAppRouter } from '#/router.ts'
import { href } from '#/routes.ts'

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

  it('streams fallback content before nested frames resolve', async () => {
    let router = createAppRouter()
    let response = await router.fetch(new Request(`http://test${href('/')}`))
    let reader = response.body!.getReader()
    let decoder = new TextDecoder()
    let first = await reader.read()
    let firstChunk = decoder.decode(first.value, { stream: true })

    assert.equal(response.headers.get('x-route-controller'), 'frames')

    assert.match(firstChunk, /Loading route summary/)
    assert.doesNotMatch(firstChunk, /Streamed route summary/)

    let body = firstChunk
    while (true) {
      let chunk = await reader.read()
      if (chunk.done) break
      body += decoder.decode(chunk.value, { stream: true })
    }
    body += decoder.decode()

    assert.match(body, /Streamed route summary/)
    assert.match(body, /Nested frame content/)
    assert.match(body, /data-frame-src="http:\/\/test\/frames\/summary"/)
    assert.match(body, /data-frame-src="http:\/\/test\/frames\/details"/)
    assert.match(body, /data-top-frame-src="http:\/\/test\/"/)
  })

  it('scopes controller middleware to its logical route tree', async () => {
    let router = createAppRouter()
    let [detailResponse, summaryResponse, aboutResponse] = await Promise.all([
      router.fetch(new Request('http://test/frames/details')),
      router.fetch(new Request('http://test/frames/summary')),
      router.fetch(new Request(`http://test${href('/about')}`)),
    ])

    assert.equal(detailResponse.headers.get('x-route-controller'), 'frames')
    assert.equal(detailResponse.headers.get('x-route-controller-detail'), 'frames.details')
    assert.equal(summaryResponse.headers.get('x-route-controller'), 'frames')
    assert.equal(summaryResponse.headers.get('x-route-controller-detail'), null)
    assert.equal(aboutResponse.headers.get('x-route-controller'), null)
  })

  it('provides typed dynamic parameters to route actions', async () => {
    let router = createAppRouter()
    let postHref = href('/posts/:slug', { slug: 'typed-routes' })
    let [getResponse, postResponse, fallbackResponse] = await Promise.all([
      router.fetch(new Request(`http://test${postHref}`)),
      router.fetch(new Request(`http://test${postHref}`, { method: 'POST' })),
      router.fetch(new Request(`http://test${postHref}`, { method: 'PATCH' })),
    ])

    assert.equal(getResponse.status, 200)
    assert.match(await getResponse.text(), /Post: typed-routes/)
    assert.equal(postResponse.status, 201)
    assert.equal(await postResponse.text(), 'Created post: typed-routes')
    assert.equal(await fallbackResponse.text(), 'Fallback for PATCH: typed-routes')
  })

  it('distinguishes routes with and without a trailing slash', async () => {
    let router = createAppRouter()
    let withoutSlash = await router.fetch(new Request(`http://test${href('/about')}`))
    let withSlash = await router.fetch(new Request(`http://test${href('/about/')}`))

    assert.equal(href('/about'), '/about')
    assert.equal(href('/about/'), '/about/')
    assert.match(await withoutSlash.text(), /<title>About<\/title>/)
    assert.match(await withSlash.text(), /<title>About \(trailing slash\)<\/title>/)
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

  it('matches deep dynamic, escaped literal, and catch-all segments', async () => {
    let router = createAppRouter()
    let projectHref = href('/projects/:projectId/settings', { projectId: 'route-lab' })
    let reportHref = href('/reports/:reportId.pdf', { reportId: 2026 })
    let [projectResponse, reportResponse, filesResponse] = await Promise.all([
      router.fetch(new Request(`http://test${projectHref}`)),
      router.fetch(new Request(`http://test${reportHref}`)),
      router.fetch(new Request('http://test/files/guides/remix/routing')),
    ])

    assert.equal(projectHref, '/projects/route-lab/settings')
    assert.match(await projectResponse.text(), /Project settings: route-lab/)
    assert.equal(reportHref, '/reports/2026.pdf')
    assert.match(await reportResponse.text(), /Report: 2026\.pdf/)
    assert.match(await filesResponse.text(), /guides\/remix\/routing/)
  })

  it('returns 404 for an unknown route', async () => {
    let router = createAppRouter()
    let response = await router.fetch(new Request('http://test/not-a-route'))

    assert.equal(response.status, 404)
  })
})
