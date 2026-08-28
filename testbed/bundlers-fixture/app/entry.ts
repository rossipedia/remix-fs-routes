import assert from 'node:assert/strict'

import { createRenderer } from '#/render.js'
import { renderWith } from 'remix/middleware/render'
import { createRouter } from 'remix/router'
import { controller } from 'virtual:remix-fs-routes/controller'
import { href, routes } from 'virtual:remix-fs-routes/routes'

let render = renderWith(createRenderer)
let router = createRouter({ middleware: [render] })
router.map(routes, controller)

let indexResponse = await router.fetch(new Request(`http://test${href('/')}`))
assert.equal(indexResponse.status, 200)
assert.match(await indexResponse.text(), /remix-fs-routes testbed/)

let postResponse = await router.fetch(
  new Request(`http://test${href('/posts/:slug', { slug: 'virtual-route' })}`),
)
assert.equal(postResponse.status, 200)
assert.match(await postResponse.text(), /Post: virtual-route/)

console.log('bundler testbed passed')
