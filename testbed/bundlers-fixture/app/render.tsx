import { createHtmlResponse } from 'remix/response/html'
import type { RequestContext } from 'remix/router'
import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'

export function createRenderer({ router, url }: RequestContext<any, any>) {
  return function render(node: RemixNode, init?: ResponseInit) {
    let stream = renderToStream(node, {
      async resolveFrame(src) {
        let response = await router.fetch(new URL(src, url))
        if (!response.ok) return `<pre>Frame error: ${response.status}</pre>`
        return response.body ?? response.text()
      },
    })

    return createHtmlResponse(stream, init)
  }
}
