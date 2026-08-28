import path from 'node:path'
import { mkdir, mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { describe, expect, it, vi } from 'vitest'

import {
  defaultControllerVirtualModuleId,
  defaultRoutesVirtualModuleId,
  unpluginFactory,
} from '../src/unplugin.js'

async function fixture(): Promise<{ cwd: string; routeModule: string }> {
  let cwd = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-unplugin-'))
  let directory = path.join(cwd, 'app/routes/posts.$slug')
  await mkdir(directory, { recursive: true })
  let routeModule = path.join(directory, 'route.ts')
  await writeFile(routeModule, 'export const action = () => new Response()\n')
  return { cwd, routeModule }
}

function hooks(plugin: ReturnType<typeof unpluginFactory>) {
  if (Array.isArray(plugin)) throw new Error('Expected one plugin')
  return {
    plugin,
    resolve: typeof plugin.resolveId === 'function' ? plugin.resolveId : plugin.resolveId?.handler,
    load: typeof plugin.load === 'function' ? plugin.load : plugin.load?.handler,
  }
}

describe('unplugin', () => {
  it('writes physical artifacts and serves separate virtual modules', async () => {
    let { cwd } = await fixture()
    let { plugin, resolve, load } = hooks(
      unpluginFactory({ cwd }, { framework: 'rollup', versions: {} }),
    )
    let addWatchFile = vi.fn()
    await plugin.buildStart?.call({ addWatchFile, error: vi.fn(), warn: vi.fn() } as never)

    let routes = await readFile(path.join(cwd, 'app/routes.ts'), 'utf8')
    let controller = await readFile(path.join(cwd, 'app/routes.controller.ts'), 'utf8')
    let companion = await readFile(path.join(cwd, 'app/routes/posts.$slug/+route.ts'), 'utf8')
    expect(routes).toContain('"posts.$slug": "/posts/:slug"')
    expect(controller).toContain('action as routeAction0')
    expect(companion).toContain('routes["posts.$slug"]')
    expect(addWatchFile).toHaveBeenCalledWith(path.join(cwd, 'app/routes'))

    let routesId = await resolve?.call(
      {} as never,
      defaultRoutesVirtualModuleId,
      undefined,
      { isEntry: false },
    )
    let controllerId = await resolve?.call(
      {} as never,
      defaultControllerVirtualModuleId,
      undefined,
      { isEntry: false },
    )
    expect(routesId).toBe(`\0${defaultRoutesVirtualModuleId}`)
    expect(controllerId).toBe(`\0${defaultControllerVirtualModuleId}`)
    let loadContext = { addWatchFile: vi.fn() } as never
    await expect(load?.call(loadContext, routesId as string)).resolves.toBe(routes)
    await expect(load?.call(loadContext, controllerId as string)).resolves.toContain(
      `from "${defaultRoutesVirtualModuleId}"`,
    )
  })

  it('regenerates physical artifacts from generic bundler watch events', async () => {
    let { cwd } = await fixture()
    let { plugin } = hooks(unpluginFactory({ cwd }, { framework: 'rollup', versions: {} }))
    let addWatchFile = vi.fn()
    let context = { addWatchFile, error: vi.fn(), warn: vi.fn() } as never
    await plugin.buildStart?.call(context)

    let aboutDirectory = path.join(cwd, 'app/routes/about')
    let aboutModule = path.join(aboutDirectory, 'route.ts')
    await mkdir(aboutDirectory)
    await writeFile(aboutModule, 'export const action = () => new Response()\n')
    await plugin.watchChange?.call(context, aboutModule, { event: 'create' })
    expect(await readFile(path.join(cwd, 'app/routes.ts'), 'utf8')).toContain('"about": "/about"')
    expect(await readFile(path.join(cwd, 'app/routes.controller.ts'), 'utf8')).toContain(
      './routes/about/route.ts',
    )
    expect(addWatchFile).toHaveBeenCalledWith(aboutModule)

    let contactDirectory = path.join(cwd, 'app/routes/contact')
    let contactModule = path.join(contactDirectory, 'route.ts')
    await unlink(aboutModule)
    await mkdir(contactDirectory)
    await writeFile(contactModule, 'export const action = () => new Response()\n')
    let deleted = plugin.watchChange?.call(context, aboutModule, { event: 'delete' })
    let created = plugin.watchChange?.call(context, contactModule, { event: 'create' })
    await Promise.all([deleted, created])
    expect(await readFile(path.join(cwd, 'app/routes.ts'), 'utf8')).not.toContain('"about"')
    expect(await readFile(path.join(cwd, 'app/routes.ts'), 'utf8')).toContain(
      '"contact": "/contact"',
    )
    await expect(readFile(path.join(aboutDirectory, '+route.ts'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    })
    expect(await readFile(path.join(contactDirectory, '+route.ts'), 'utf8')).toContain(
      'routes["contact"]',
    )
  })

  it('resolves importer-specific companions in virtual-only mode', async () => {
    let { cwd, routeModule } = await fixture()
    let { plugin, resolve, load } = hooks(
      unpluginFactory({ cwd, write: false }, { framework: 'vite', versions: {} }),
    )
    await plugin.buildStart?.call({ addWatchFile: vi.fn(), error: vi.fn(), warn: vi.fn() } as never)
    await expect(readFile(path.join(cwd, 'app/routes.ts'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    })

    let companionId = await resolve?.call({} as never, './+route.ts', routeModule, {
      isEntry: false,
    })
    expect(companionId).toContain('remix-fs-routes:companion:posts.%24slug')
    let loadContext = { addWatchFile: vi.fn() } as never
    await expect(load?.call(loadContext, companionId as string)).resolves.toContain(
      'routes["posts.$slug"]',
    )

    let virtualModule = {}
    let invalidateModule = vi.fn()
    let send = vi.fn()
    let configureServer =
      typeof plugin.vite?.configureServer === 'function'
        ? plugin.vite.configureServer
        : plugin.vite?.configureServer?.handler
    configureServer?.call({} as never, {
      moduleGraph: {
        getModuleById: vi.fn(() => virtualModule),
        invalidateModule,
      },
      watcher: { add: vi.fn() },
      ws: { send },
    } as never)

    let aboutDirectory = path.join(cwd, 'app/routes/about')
    let aboutModule = path.join(aboutDirectory, 'route.ts')
    await mkdir(aboutDirectory)
    await writeFile(aboutModule, 'export const action = () => new Response()\n')
    await plugin.watchChange?.call(
      { addWatchFile: vi.fn(), error: vi.fn(), warn: vi.fn() } as never,
      aboutModule,
      { event: 'create' },
    )
    let routesId = await resolve?.call(
      {} as never,
      defaultRoutesVirtualModuleId,
      undefined,
      { isEntry: false },
    )
    await expect(load?.call(loadContext, routesId as string)).resolves.toContain(
      '"about": "/about"',
    )
    expect(invalidateModule).toHaveBeenCalledWith(virtualModule)
    expect(send).toHaveBeenCalledWith({ type: 'full-reload' })
  })
})
