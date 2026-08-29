import { createHtmlResponse } from 'remix/response/html'
import type { RequestContext } from 'remix/router'
import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'

const topFrameSrcHeader = 'x-remix-ui-top-frame-src'

export function createRenderer({ request, router, url }: RequestContext<any, any>) {
  let topFrameSrc = request.headers.get(topFrameSrcHeader) ?? url.href

  return function render(node: RemixNode, init?: ResponseInit) {
    let stream = renderToStream(node, {
      frameSrc: url,
      topFrameSrc,
      signal: request.signal,
      async resolveFrame(src, _target, context) {
        let frameUrl = new URL(src, context?.currentFrameSrc ?? url)
        let headers = new Headers(request.headers)
        headers.set('accept', 'text/html')
        headers.set(topFrameSrcHeader, context?.topFrameSrc ?? topFrameSrc)

        let response = await router.fetch(
          new Request(frameUrl, { headers, signal: request.signal }),
        )
        if (!response.ok) return `<pre>Frame error: ${response.status}</pre>`
        return response.body ?? response.text()
      },
    })

    return createHtmlResponse(stream, init)
  }
}
