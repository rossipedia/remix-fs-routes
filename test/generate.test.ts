import path from 'node:path'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'

import {
  generateRouteArtifacts,
  generatedFileHeader,
  writeRouteArtifacts,
  writeRouteTypes,
} from '../src/index.js'

async function project(): Promise<string> {
  let cwd = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-generate-'))
  for (let route of ['_index', 'users.$id']) {
    let directory = path.join(cwd, 'app/routes', route)
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, 'action.tsx'), 'export default () => new Response()\n')
  }
  return cwd
}

describe('route artifact generation', () => {
  it('emits bound route companions, central runtime modules, and virtual declarations', async () => {
    let cwd = await project()
    let result = await generateRouteArtifacts({ cwd })
    let routes = result.artifacts.find((artifact) => artifact.kind === 'routes')!
    let support = result.artifacts.find((artifact) => artifact.output.endsWith('.support.js'))!
    let supportTypes = result.artifacts.find((artifact) => artifact.output.endsWith('.support.d.ts'))!
    let controller = result.artifacts.find((artifact) => artifact.kind === 'controller')!
    let userRoute = result.artifacts.find((artifact) => artifact.routeId === 'users.$id')!
    let virtualTypes = result.artifacts.find((artifact) => artifact.kind === 'virtual-types')!

    expect(routes.source).toContain("import { route } from 'remix/routes'")
    expect(routes.source).toContain('"users.$id": "/users/:id",')
    expect(routes.source).toContain('export type RoutePattern = "/" | "/users/:id"')
    expect(routes.source).toContain('export function href<const pattern extends RoutePattern>')
    expect(routes.source).toContain('return createHref(pattern, ...args)')
    expect(support.source).toContain('export function createRouteAction()')
    expect(supportTypes.source).toContain('export declare function createRouteAction<')
    expect(controller.source).toContain('createController(routes, {')
    expect(controller.source).toContain('import routeAction1 from')
    expect(controller.source).toContain('"users.$id": routeAction1')
    expect(userRoute.source).toContain('export const route = routes["users.$id"]')
    expect(userRoute.source).toContain('createRouteAction(route)')
    expect(userRoute.source).not.toMatch(/from ["']remix-fs-routes/)
    expect(userRoute.output).toContain('app/routes/users.$id/+route.ts')
    expect(virtualTypes.source).toContain(
      'readonly "users.$id": Route<\'ANY\', "/users/:id">',
    )
    expect(virtualTypes.source).toContain('export type RoutePattern = "/" | "/users/:id"')
    expect(virtualTypes.source).toContain('export function href<const pattern extends RoutePattern>')
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
    await writeFile(path.join(about, 'action.ts'), 'export default () => new Response()\n')
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
    expect(await readFile(
      path.join(cwd, '.remix-fs-routes/types/virtual.d.ts'),
      'utf8',
    )).toContain('readonly "users.$id": Route<\'ANY\', "/users/:id">')
  })

  it('removes stale generated types and legacy companions while protecting user files', async () => {
    let cwd = await project()
    await writeRouteArtifacts({ cwd })
    let staleDirectory = path.join(cwd, 'app/routes/old')
    await mkdir(staleDirectory)
    let staleCompanion = path.join(staleDirectory, '+route.ts')
    await writeFile(staleCompanion, `${generatedFileHeader}\nexport {}\n`)
    let staleType = path.join(
      cwd,
      '.remix-fs-routes/types/app/routes/old/+types/route.d.ts',
    )
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
    expect(routes.source).toContain("import { createHref } from 'remix/route-pattern/href'")
    expect(routes.source).toContain('export function href(pattern, ...args)')
    expect(controller.source).toContain('export const appController = createController(appRoutes')
    let indexRoute = generated.artifacts.find((artifact) => artifact.routeId === '_index')!
    expect(indexRoute.output).toContain('app/routes/_index/+route.ts')
    expect(indexRoute.source).toContain('export const route = appRoutes["_index"]')
    expect(indexRoute.source).toContain('../../generated/contract.support.js')

    await expect(generateRouteArtifacts({ cwd, routesExportName: 'not-valid' })).rejects.toThrow(
      'Invalid routes export name',
    )
    await expect(generateRouteArtifacts({ cwd, controllerOutput: 'controller.txt' })).rejects.toThrow(
      'must use .ts',
    )
  })
})
