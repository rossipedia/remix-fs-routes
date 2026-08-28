import assert from 'node:assert/strict'

import { createRouter } from 'remix/router'
import { controller } from 'virtual:remix-fs-routes/controller'
import { routes } from 'virtual:remix-fs-routes/routes'

let router = createRouter()
router.map(routes, controller)

let indexResponse = await router.fetch(new Request(`http://test${routes._index.href()}`))
assert.equal(indexResponse.status, 200)
assert.equal(await indexResponse.text(), 'bundler testbed index')

let postResponse = await router.fetch(
  new Request(`http://test${routes['posts.$slug'].href({ slug: 'virtual-route' })}`),
)
assert.equal(postResponse.status, 200)
assert.equal(await postResponse.text(), 'post virtual-route')

console.log('bundler testbed passed')
