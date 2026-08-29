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
        'about._index',
        'blog.$slug',
        'docs.(section)',
        '(legacy)',
        'files.$',
        '($lang).categories',
        'reports.$id[.pdf]',
        'sitemap[.]xml',
        '_auth.login',
        'concerts_.mine',
        'search_index',
        '[_status]',
        'account[_]',
        'weird.[(literal)]',
      ]),
    )

    let manifest = await scanRoutes({ cwd })
    expect(Object.fromEntries(manifest.routes.map((entry) => [entry.id, entry.pattern]))).toEqual({
      '($lang).categories': '(:lang/)categories',
      '(legacy)': '(legacy)',
      _index: '/',
      about: '/about',
      'about._index': '/about/',
      'blog.$slug': '/blog/:slug',
      '_auth.login': '/login',
      'concerts_.mine': '/concerts/mine',
      search_index: '/search_index',
      '[_status]': '/_status',
      'account[_]': '/account_',
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
    expect(routes['about._index']!.href()).toBe('/about/')
  })

  it('discovers logical controller boundaries and assigns routes to their ancestry', async () => {
    let cwd = await fixture([
      '_auth/controller.ts',
      '_auth.login/action.ts',
      'admin/action.ts',
      'admin/controller.tsx',
      'admin.users/action.ts',
      'admin.projects/controller.mts',
      'admin.projects.settings/action.ts',
      'admin_.health/action.ts',
    ])

    let manifest = await scanRoutes({ cwd })
    expect(manifest.controllers).toEqual([
      { id: '_auth', file: 'routes/_auth/controller.ts' },
      { id: 'admin', file: 'routes/admin/controller.tsx' },
      { id: 'admin.projects', file: 'routes/admin.projects/controller.mts' },
    ])
    expect(
      Object.fromEntries(
        manifest.routes.map((entry) => [entry.id, [entry.pattern, entry.controllerIds]]),
      ),
    ).toEqual({
      '_auth.login': ['/login', ['_auth']],
      admin: ['/admin', ['admin']],
      'admin.users': ['/admin/users', ['admin']],
      'admin.projects.settings': ['/admin/projects/settings', ['admin', 'admin.projects']],
      'admin_.health': ['/admin/health', []],
    })
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

  it('accepts every executable JavaScript and TypeScript module extension', async () => {
    let extensions = ['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts']
    let cwd = await fixture(extensions.map((extension) => `${extension}/action.${extension}`))

    let manifest = await scanRoutes({ cwd })
    expect(manifest.routes.map(({ id, file }) => ({ id, file }))).toEqual(
      extensions
        .map((extension) => ({ id: extension, file: `routes/${extension}/action.${extension}` }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    )
  })

  it('keeps descriptive parent ids and distinguishes trailing-slash routes', async () => {
    let cwd = await fixture(folders(['concerts', 'concerts._index', 'concerts.$city']))
    let manifest = await scanRoutes({ cwd })

    expect(manifest.routes).toMatchObject([
      { id: 'concerts', pattern: '/concerts', trailingSlash: false },
      {
        id: 'concerts._index',
        path: 'concerts/',
        pattern: '/concerts/',
        parentId: 'concerts',
        trailingSlash: true,
      },
      {
        id: 'concerts.$city',
        pattern: '/concerts/:city',
        parentId: 'concerts',
        trailingSlash: false,
      },
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

    let misplacedIndex = await fixture(folders(['_index.child']))
    await expect(scanRoutes({ cwd: misplacedIndex })).rejects.toThrow(
      '_index is only supported as the final route segment',
    )

    let legacy = await fixture(['account/route.tsx'])
    await expect(scanRoutes({ cwd: legacy })).rejects.toThrow(
      'rename the route module to one of: action.js',
    )

    let folderConflict = await fixture(['account/action.mts', 'account/action.cjs'])
    await expect(scanRoutes({ cwd: folderConflict })).rejects.toThrow('multiple action modules')

    let controllerConflict = await fixture(['account/controller.mts', 'account/controller.cjs'])
    await expect(scanRoutes({ cwd: controllerConflict })).rejects.toThrow(
      'multiple controller modules',
    )

    let pathConflict = await fixture(folders(['about', '[about]']))
    await expect(scanRoutes({ cwd: pathConflict })).rejects.toThrow('Route path collision')
  })
})
