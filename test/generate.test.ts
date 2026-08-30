import path from 'node:path'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import {
  generateRouteArtifacts,
  generatedFileHeader,
  writeRouteArtifacts,
  writeRouteTypes,
} from '../src/index.js'

const execFileAsync = promisify(execFile)
const repositoryDirectory = path.resolve(import.meta.dirname, '..')

async function project(): Promise<string> {
  let cwd = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-generate-'))
  for (let route of ['_index', 'users.$id']) {
    let directory = path.join(cwd, 'app/routes', route)
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, 'actions.tsx'), 'export default () => new Response()\n')
  }
  return cwd
}

describe('route artifact generation', () => {
  it('typechecks, builds, and runs a project with no routes', async () => {
    let cwd = await mkdtemp(path.join(repositoryDirectory, '.remix-fs-routes-empty-'))
    try {
      await writeRouteArtifacts({ cwd })
      await writeFile(path.join(cwd, 'package.json'), '{"type":"module"}\n')
      await writeFile(
        path.join(cwd, 'app/router.ts'),
        [
          "import { createRouter } from 'remix/router'",
          "import { registerRoutes } from './routes.controller.ts'",
          '',
          'let router = createRouter()',
          'registerRoutes(router)',
          "let response = await router.fetch('http://test/no-routes')",
          "if (response.status !== 404) throw new Error('Expected the empty router to return 404')",
          '',
        ].join('\n'),
      )
      await writeFile(
        path.join(cwd, 'tsconfig.json'),
        `${JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'NodeNext',
              moduleResolution: 'NodeNext',
              strict: true,
              skipLibCheck: true,
              allowJs: true,
              checkJs: false,
              allowImportingTsExtensions: true,
              rewriteRelativeImportExtensions: true,
              rootDir: '.',
              outDir: 'dist',
            },
            include: ['app/**/*'],
          },
          null,
          2,
        )}\n`,
      )

      let virtualTypes = await readFile(
        path.join(cwd, '.remix-fs-routes/types/virtual.d.ts'),
        'utf8',
      )
      expect(virtualTypes).toContain('export type RoutePattern = never')

      await execFileAsync(path.join(repositoryDirectory, 'node_modules/.bin/tsc'), [
        '--project',
        path.join(cwd, 'tsconfig.json'),
      ])
      await execFileAsync(process.execPath, [path.join(cwd, 'dist/app/router.js')])
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it('emits bound route companions, central runtime modules, and virtual declarations', async () => {
    let cwd = await project()
    let result = await generateRouteArtifacts({ cwd })
    let routes = result.artifacts.find((artifact) => artifact.kind === 'routes')!
    let support = result.artifacts.find((artifact) => artifact.output.endsWith('.support.js'))!
    let supportTypes = result.artifacts.find((artifact) =>
      artifact.output.endsWith('.support.d.ts'),
    )!
    let controller = result.artifacts.find((artifact) => artifact.kind === 'controller')!
    let userRoute = result.artifacts.find((artifact) => artifact.routeId === 'users.$id')!
    let virtualTypes = result.artifacts.find((artifact) => artifact.kind === 'virtual-types')!

    expect(routes.source).toContain("import { route } from 'remix/routes'")
    expect(routes.source).toContain('const routeDefs = {')
    expect(routes.source).toContain('"users.$id": "/users/:id",')
    expect(routes.source).toContain('} as const')
    expect(routes.source).toContain('export const routes = route(routeDefs)')
    expect(routes.source).toContain(
      'export type RoutePattern = typeof routeDefs[keyof typeof routeDefs]',
    )
    expect(routes.source).toContain('export function href<const pattern extends RoutePattern>')
    expect(routes.source).toContain('return createHref(pattern, ...args)')
    expect(routes.source).not.toContain('routeManifest')
    expect(support.source).toContain('export function createRouteAction()')
    expect(support.source).toContain('export function registerRouteModule(')
    expect(support.source).toContain("connect: 'CONNECT'")
    expect(support.source).toContain("trace: 'TRACE'")
    expect(supportTypes.source).toContain('export declare function createRouteAction<')
    expect(supportTypes.source).toContain(
      "export type UnsupportedRouteMethodExport = 'connect' | 'trace'",
    )
    expect(controller.source).toContain('export function registerRoutes')
    expect(controller.source).toContain('import * as routeModule1 from')
    expect(controller.source).toContain(
      'registerRouteModule(router, routes["users.$id"], routeModule1)',
    )
    expect(userRoute.source).toContain('export const route = routes["users.$id"]')
    expect(userRoute.source).toContain('createRouteAction(route)')
    expect(userRoute.source).not.toMatch(/from ["']remix-fs-routes/)
    expect(userRoute.output).toContain('app/routes/users.$id/+route.ts')
    expect(virtualTypes.source).toContain('readonly "users.$id": Route<\'ANY\', "/users/:id">')
    expect(virtualTypes.source).toContain('export type RoutePattern = "/" | "/users/:id"')
    expect(virtualTypes.source).toContain(
      'export function href<const pattern extends RoutePattern>',
    )
    expect(virtualTypes.source).not.toContain('routeManifest')
    expect(result.artifacts.map((artifact) => artifact.kind)).toEqual([
      'route-module',
      'route-module',
      'route-support',
      'route-support',
      'routes',
      'controller',
      'virtual-types',
    ])
  })

  it('generates typed controller factories and composes nested controller middleware', async () => {
    let cwd = await project()
    for (let [id, filename] of [
      ['users', 'controller.ts'],
      ['users.$id', 'controller.tsx'],
    ]) {
      let directory = path.join(cwd, 'app/routes', id)
      await mkdir(directory, { recursive: true })
      await writeFile(
        path.join(directory, filename),
        `import { createController } from './+controller.ts'\nexport default createController({ middleware: [] })\n`,
      )
    }

    let result = await generateRouteArtifacts({ cwd })
    let companions = result.artifacts.filter((artifact) => artifact.kind === 'controller-module')
    let userRoute = result.artifacts.find((artifact) => artifact.routeId === 'users.$id')!
    let controller = result.artifacts.find((artifact) => artifact.kind === 'controller')!

    expect(companions).toHaveLength(2)
    expect(companions[0]!.source).toContain(
      'export const createController = createRouteController()',
    )
    expect(userRoute.source).toContain('import type routeController0 from "../users/controller.ts"')
    expect(userRoute.source).toContain('import type routeController1 from "./controller.tsx"')
    expect(userRoute.source).toContain('ControllerContext<InheritedMiddleware>')
    expect(controller.source).toContain('...routeController0.middleware')
    expect(controller.source).toContain('...routeController1.middleware')
    expect(controller.source).toContain(
      'registerRouteModule(router, routes["users.$id"], routeModule1, [',
    )
  })

  it('typechecks and dispatches named HTTP method exports before the default fallback', async () => {
    let cwd = await mkdtemp(path.join(repositoryDirectory, '.remix-fs-routes-methods-'))
    try {
      await mkdir(path.join(cwd, 'app/routes/api'), { recursive: true })
      await mkdir(path.join(cwd, 'app/routes/api.$id'), { recursive: true })
      await mkdir(path.join(cwd, 'app/routes/health'), { recursive: true })
      await writeFile(
        path.join(cwd, 'app/routes/api/controller.ts'),
        [
          "import type { Middleware } from 'remix/router'",
          "import { createController } from './+controller.ts'",
          '',
          'const markController: Middleware = async (_context, next) => {',
          '  let response = await next()',
          "  response.headers.set('x-controller', 'api')",
          '  return response',
          '}',
          '',
          'export default createController({ middleware: [markController] })',
          '',
        ].join('\n'),
      )
      await writeFile(
        path.join(cwd, 'app/routes/api.$id/actions.ts'),
        [
          "import type { Middleware } from 'remix/router'",
          "import { createAction } from './+route.ts'",
          '',
          'const markAction: Middleware = async (_context, next) => {',
          '  let response = await next()',
          "  response.headers.set('x-action', 'post')",
          '  return response',
          '}',
          '',
          'export let get = createAction(({ params }) => new Response(`get:${params.id}`))',
          'export let head = createAction(() => new Response(null, { headers: { "x-handler": "head" } }))',
          'export let post = createAction({ middleware: [markAction] })(',
          '  ({ params }) => new Response(`post:${params.id}`),',
          ')',
          'export let put = createAction(({ params }) => new Response(`put:${params.id}`))',
          'export let patch = createAction(({ params }) => new Response(`patch:${params.id}`))',
          'let remove = createAction(({ params }) => new Response(`delete:${params.id}`))',
          'export { remove as delete }',
          'export let options = createAction(() => new Response(null, { status: 204 }))',
          'export default createAction(({ request }) => new Response(`any:${request.method}`))',
          '',
        ].join('\n'),
      )
      await writeFile(
        path.join(cwd, 'app/routes/health/actions.ts'),
        [
          "import { createAction } from './+route.ts'",
          "export let get = createAction(() => new Response('healthy'))",
          '',
        ].join('\n'),
      )
      await writeRouteArtifacts({ cwd })
      await writeFile(path.join(cwd, 'package.json'), '{"type":"module"}\n')
      await writeFile(
        path.join(cwd, 'app/router.ts'),
        [
          "import { createRouter } from 'remix/router'",
          "import { routes } from './routes.ts'",
          "import { registerRoutes } from './routes.controller.ts'",
          "import { registerRouteModule } from './routes.support.js'",
          '',
          'let router = createRouter()',
          'registerRoutes(router)',
          '',
          "let get = await router.fetch('http://test/api/42')",
          "if ((await get.text()) !== 'get:42') throw new Error('GET did not use its named export')",
          "if (get.headers.get('x-controller') !== 'api') throw new Error('Missing controller middleware')",
          '',
          "let head = await router.fetch('http://test/api/42', { method: 'HEAD' })",
          "if (head.headers.get('x-handler') !== 'head') throw new Error('HEAD did not use its named export')",
          '',
          "let post = await router.fetch('http://test/api/42', { method: 'POST' })",
          "if ((await post.text()) !== 'post:42') throw new Error('POST did not use its named export')",
          "if (post.headers.get('x-action') !== 'post') throw new Error('Missing action middleware')",
          "if (post.headers.get('x-controller') !== 'api') throw new Error('Missing controller middleware')",
          '',
          "let put = await router.fetch('http://test/api/42', { method: 'PUT' })",
          "if ((await put.text()) !== 'put:42') throw new Error('PUT did not use its named export')",
          '',
          "let patch = await router.fetch('http://test/api/42', { method: 'PATCH' })",
          "if ((await patch.text()) !== 'patch:42') throw new Error('PATCH did not use its named export')",
          '',
          "let remove = await router.fetch('http://test/api/42', { method: 'DELETE' })",
          "if ((await remove.text()) !== 'delete:42') throw new Error('DELETE did not use its named export')",
          '',
          "let options = await router.fetch('http://test/api/42', { method: 'OPTIONS' })",
          "if (options.status !== 204) throw new Error('OPTIONS did not use its named export')",
          '',
          "let fallback = await router.fetch('http://test/api/42', { method: 'PROPFIND' })",
          "if ((await fallback.text()) !== 'any:PROPFIND') throw new Error('A custom method did not use the default export')",
          '',
          "let missing = await router.fetch('http://test/health', { method: 'POST' })",
          "if (missing.status !== 404) throw new Error('A method-only route should not catch other methods')",
          '',
          "for (let method of ['connect', 'trace'] as const) {",
          '  try {',
          '    registerRouteModule(router, routes["api.$id"], { [method]: () => new Response() })',
          '  } catch (error) {',
          '    if (error instanceof TypeError && error.message.includes(method.toUpperCase())) continue',
          '    throw error',
          '  }',
          '  throw new Error(`${method.toUpperCase()} should be rejected explicitly`)',
          '}',
          '',
        ].join('\n'),
      )
      await writeFile(
        path.join(cwd, 'tsconfig.json'),
        `${JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'NodeNext',
              moduleResolution: 'NodeNext',
              strict: true,
              skipLibCheck: true,
              allowJs: true,
              checkJs: false,
              allowImportingTsExtensions: true,
              rewriteRelativeImportExtensions: true,
              rootDir: '.',
              outDir: 'dist',
            },
            include: ['app/**/*'],
          },
          null,
          2,
        )}\n`,
      )

      await execFileAsync(path.join(repositoryDirectory, 'node_modules/.bin/tsc'), [
        '--project',
        path.join(cwd, 'tsconfig.json'),
      ])
      await execFileAsync(process.execPath, [path.join(cwd, 'dist/app/router.js')])
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it('writes atomically and reports stale artifacts', async () => {
    let cwd = await project()
    let first = await writeRouteArtifacts({ cwd })
    expect(first.changed).toBe(true)
    for (let artifact of first.artifacts) {
      expect(await readFile(artifact.output, 'utf8')).toBe(artifact.source)
    }

    let current = await writeRouteArtifacts({ cwd, check: true })
    expect(current.changed).toBe(false)

    let about = path.join(cwd, 'app/routes/about')
    await mkdir(about)
    await writeFile(path.join(about, 'actions.ts'), 'export default () => new Response()\n')
    let stale = await writeRouteArtifacts({ cwd, check: true })
    expect(stale.changed).toBe(true)
    expect(stale.artifacts.find((artifact) => artifact.kind === 'routes')?.changed).toBe(true)
  })

  it('can write only virtual-module declarations', async () => {
    let cwd = await project()
    let result = await writeRouteTypes({ cwd })

    expect(result.artifacts.map((artifact) => artifact.kind)).toEqual(['virtual-types'])
    await expect(readFile(path.join(cwd, 'app/routes.ts'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    })
    expect(await readFile(path.join(cwd, '.remix-fs-routes/types/virtual.d.ts'), 'utf8')).toContain(
      'readonly "users.$id": Route<\'ANY\', "/users/:id">',
    )
  })

  it('uses absolute route definitions so RoutePattern can be derived from their values', async () => {
    let cwd = await project()
    let optionalRoute = path.join(cwd, 'app/routes/($lang).hello')
    await mkdir(optionalRoute)
    await writeFile(path.join(optionalRoute, 'actions.ts'), 'export default () => new Response()\n')

    let generated = await generateRouteArtifacts({ cwd })
    let routes = generated.artifacts.find((artifact) => artifact.kind === 'routes')!

    expect(routes.source).toContain('"($lang).hello": "/(:lang/)hello",')
    expect(routes.source).toContain(
      'export type RoutePattern = typeof routeDefs[keyof typeof routeDefs]',
    )
  })

  it('removes stale generated types and legacy companions while protecting user files', async () => {
    let cwd = await project()
    await writeRouteArtifacts({ cwd })
    let staleDirectory = path.join(cwd, 'app/routes/old')
    await mkdir(staleDirectory)
    let staleCompanion = path.join(staleDirectory, '+route.ts')
    await writeFile(staleCompanion, `${generatedFileHeader}\nexport {}\n`)
    let staleType = path.join(cwd, '.remix-fs-routes/types/app/routes/old/+types/route.d.ts')
    await mkdir(path.dirname(staleType), { recursive: true })
    await writeFile(staleType, `${generatedFileHeader}\nexport {}\n`)

    let checked = await writeRouteArtifacts({ cwd, check: true })
    expect(checked.removed).toEqual([staleType, staleCompanion].sort((a, b) => a.localeCompare(b)))
    await writeRouteArtifacts({ cwd })
    await expect(readFile(staleCompanion, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(staleType, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })

    let userCompanion = path.join(cwd, 'app/routes/users.$id/+route.ts')
    await writeFile(userCompanion, 'export const mine = true\n')
    await expect(writeRouteArtifacts({ cwd })).rejects.toThrow('Refusing to overwrite user-owned')
    expect(await readFile(userCompanion, 'utf8')).toBe('export const mine = true\n')

    await writeFile(userCompanion, `${generatedFileHeader}\nexport {}\n`)
    let routesOutput = path.join(cwd, 'app/routes.ts')
    await writeFile(routesOutput, 'export const handwritten = true\n')
    await expect(writeRouteArtifacts({ cwd })).rejects.toThrow(`user-owned file ${routesOutput}`)
    expect(await readFile(userCompanion, 'utf8')).toBe(`${generatedFileHeader}\nexport {}\n`)
  })

  it('supports custom outputs and validates export names and output syntax', async () => {
    let cwd = await project()
    let generated = await generateRouteArtifacts({
      cwd,
      routesOutput: 'generated/contract.js',
      controllerOutput: 'generated/controller.js',
      typegenDirectory: 'generated/types',
      routesExportName: 'appRoutes',
      controllerExportName: 'appController',
    })
    let routes = generated.artifacts.find((artifact) => artifact.kind === 'routes')!
    let controller = generated.artifacts.find((artifact) => artifact.kind === 'controller')!
    expect(routes.source).not.toContain('as const')
    expect(routes.source).toContain('const routeDefs = {')
    expect(routes.source).toContain('export const appRoutes = route(routeDefs)')
    expect(routes.source).toContain("import { createHref } from 'remix/route-pattern/href'")
    expect(routes.source).toContain('export function href(pattern, ...args)')
    expect(controller.source).toContain('export function appController(router)')
    let indexRoute = generated.artifacts.find((artifact) => artifact.routeId === '_index')!
    expect(indexRoute.output).toContain('app/routes/_index/+route.ts')
    expect(indexRoute.source).toContain('export const route = appRoutes["_index"]')
    expect(indexRoute.source).toContain('../../generated/contract.support.js')

    let routeDefsExport = await generateRouteArtifacts({ cwd, routesExportName: 'routeDefs' })
    let routeDefsSource = routeDefsExport.artifacts.find(
      (artifact) => artifact.kind === 'routes',
    )!.source
    expect(routeDefsSource).toContain('const generatedRouteDefs = {')
    expect(routeDefsSource).toContain('export const routeDefs = route(generatedRouteDefs)')

    await expect(generateRouteArtifacts({ cwd, routesExportName: 'not-valid' })).rejects.toThrow(
      'Invalid routes export name',
    )
    await expect(
      generateRouteArtifacts({ cwd, controllerOutput: 'controller.txt' }),
    ).rejects.toThrow('must use .ts')
  })
})
