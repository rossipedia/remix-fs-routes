import path from 'node:path'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'
import { RoutePattern } from 'remix/route-pattern'
import { route } from 'remix/routes'

import { RouteConventionError, scanRoutes } from '../src/index.js'

async function fixture(files: string[]): Promise<string> {
  let cwd = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-'))
  for (let file of files) {
    let absolute = path.join(cwd, 'app', 'routes', file)
    await mkdir(path.dirname(absolute), { recursive: true })
    await writeFile(absolute, '')
  }
  return cwd
}

function folders(ids: string[]): string[] {
  return ids.map((id) => `${id}/action.ts`)
}

describe('scanRoutes', () => {
  it('applies the flat-route grammar to route folder names', async () => {
    let cwd = await fixture(
      folders([
        '_index',
        'about',
        'blog.$slug',
        'docs.(section)',
        '(legacy)',
        'files.$',
        '($lang).categories',
        'reports.$id[.pdf]',
        'sitemap[.]xml',
        'concerts_.mine',
        'weird.[(literal)]',
      ]),
    )

    let manifest = await scanRoutes({ cwd })
    expect(Object.fromEntries(manifest.routes.map((entry) => [entry.id, entry.pattern]))).toEqual({
      '($lang).categories': '(:lang/)categories',
      '(legacy)': '(legacy)',
      _index: '/',
      about: '/about',
      'blog.$slug': '/blog/:slug',
      'concerts_.mine': '/concerts/mine',
      'docs.(section)': '/docs(/section)',
      'files.$': '/files/*',
      'reports.$id[.pdf]': '/reports/:id.pdf',
      'sitemap[.]xml': '/sitemap.xml',
      'weird.[(literal)]': '/weird/\\(literal\\)',
    })
    for (let entry of manifest.routes) expect(() => RoutePattern.parse(entry.pattern)).not.toThrow()
    let routes = route(
      Object.fromEntries(manifest.routes.map((entry) => [entry.id, entry.pattern])),
    )
    expect(routes['($lang).categories']!.href()).toBe('/categories')
    expect(routes['($lang).categories']!.href({ lang: 'es' })).toBe('/es/categories')
  })

  it('accepts action entrypoints without scanning colocated files', async () => {
    let cwd = await fixture([
      'account/action.tsx',
      'account/component.tsx',
      'settings/action.ts',
      'settings/helper.ts',
      'ignored/route.mdx',
    ])

    let manifest = await scanRoutes({ cwd })
    expect(manifest.routes.map(({ id, file }) => ({ id, file }))).toEqual([
      { id: 'account', file: 'routes/account/action.tsx' },
      { id: 'settings', file: 'routes/settings/action.ts' },
    ])
  })

  it('keeps organizational pathless prefixes and descriptive parent ids', async () => {
    let cwd = await fixture(folders(['_auth.login', 'concerts', 'concerts.$city']))
    let manifest = await scanRoutes({ cwd })

    expect(manifest.routes).toMatchObject([
      { id: '_auth.login', pattern: '/login', index: false },
      { id: 'concerts', pattern: '/concerts', index: false },
      { id: 'concerts.$city', pattern: '/concerts/:city', parentId: 'concerts', index: false },
    ])
  })

  it('applies ignore globs to route folders and app-relative entrypoints', async () => {
    let cwd = await fixture(folders(['home', 'admin', '.hidden']))
    let manifest = await scanRoutes({
      cwd,
      ignoredRouteFiles: ['home', 'routes/admin/action.ts'],
    })
    expect(manifest.routes).toEqual([])
  })

  it('returns an empty manifest when the routes directory does not exist', async () => {
    let cwd = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-'))
    await expect(scanRoutes({ cwd })).resolves.toMatchObject({ routes: [] })
  })

  it('rejects files, layouts, legacy or duplicate entrypoints, and path collisions', async () => {
    let flatFile = await fixture(['about.tsx'])
    await expect(scanRoutes({ cwd: flatFile })).rejects.toThrow('must be placed in a route folder')

    let layout = await fixture(folders(['_auth']))
    await expect(scanRoutes({ cwd: layout })).rejects.toThrow('is pathless')

    let legacy = await fixture(['account/route.tsx'])
    await expect(scanRoutes({ cwd: legacy })).rejects.toThrow('rename the route module to action.js')

    let folderConflict = await fixture(['account/action.tsx', 'account/action.ts'])
    await expect(scanRoutes({ cwd: folderConflict })).rejects.toThrow('multiple action modules')

    let pathConflict = await fixture(folders(['about', '_public.about']))
    await expect(scanRoutes({ cwd: pathConflict })).rejects.toThrow('Route path collision')

    let indexConflict = await fixture(folders(['concerts', 'concerts._index']))
    await expect(scanRoutes({ cwd: indexConflict })).rejects.toThrow('Route path collision')
  })
})
