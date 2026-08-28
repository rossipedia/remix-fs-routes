import { html } from 'remix/html-template'
import { createHtmlResponse } from 'remix/response/html'

export function page(title: string, content: ReturnType<typeof html>) {
  return createHtmlResponse(html`
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 48rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5; }
          code { background: #f1f3f5; padding: 0.15rem 0.35rem; border-radius: 0.25rem; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${content}
      </body>
    </html>
  `)
}
