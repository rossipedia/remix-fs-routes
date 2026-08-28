import { createHtmlResponse } from 'remix/response/html'
import { css, type Handle, type RemixNode } from 'remix/ui'
import { renderToString } from 'remix/ui/server'

interface PageProps {
  children?: RemixNode
  title: string
}

export function Page(handle: Handle<PageProps>) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <title>{handle.props.title}</title>
      </head>
      <body mix={pageStyle}>
        <h1>{handle.props.title}</h1>
        {handle.props.children}
      </body>
    </html>
  )
}

export async function page(title: string, content: RemixNode) {
  return createHtmlResponse(await renderToString(<Page title={title}>{content}</Page>))
}

const pageStyle = css({
  colorScheme: 'light dark',
  '--page-background': '#f8fafc',
  '--text-color': '#172033',
  '--link-color': '#315bb5',
  '--visited-link-color': '#7048a8',
  '--code-background': '#e9eef5',
  '--code-color': '#25324a',
  background: 'var(--page-background)',
  color: 'var(--text-color)',
  fontFamily: 'system-ui, sans-serif',
  lineHeight: 1.5,
  margin: '0 auto',
  maxWidth: '48rem',
  minHeight: '100vh',
  padding: '4rem 1rem',
  '& a': {
    color: 'var(--link-color)',
  },
  '& a:visited': {
    color: 'var(--visited-link-color)',
  },
  '& code': {
    background: 'var(--code-background)',
    borderRadius: '0.25rem',
    color: 'var(--code-color)',
    padding: '0.15rem 0.35rem',
  },
  '@media (prefers-color-scheme: dark)': {
    '--page-background': '#0f172a',
    '--text-color': '#e5e7eb',
    '--link-color': '#8ab4ff',
    '--visited-link-color': '#c4b5fd',
    '--code-background': '#1e293b',
    '--code-color': '#f1f5f9',
  },
})
