import path from 'node:path'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'

import {
  generateRouteArtifacts,
  generatedFileHeader,
  writeRouteArtifacts,
} from '../src/index.js'

async function project(): Promise<string> {
  let cwd = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-generate-'))
  for (let route of ['_index', 'users.$id']) {
    let directory = path.join(cwd, 'app/routes', route)
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, 'route.tsx'), 'export const action = () => new Response()\n')
  }
  return cwd
}

describe('route artifact generation', () => {
  it('emits a route map, controller, and route-specific companions', async () => {
    let cwd = await project()
    let result = await generateRouteArtifacts({ cwd })
    let routes = result.artifacts.find((artifact) => artifact.kind === 'routes')!
    let controller = result.artifacts.find((artifact) => artifact.kind === 'controller')!
    let userCompanion = result.artifacts.find((artifact) => artifact.routeId === 'users.$id')!

    expect(routes.source).toContain("import { route } from 'remix/routes'")
    expect(routes.source).toContain('"users.$id": "/users/:id",')
    expect(controller.source).toContain('createController(routes, {')
    expect(controller.source).toContain('action as routeAction1')
    expect(controller.source).toContain('"users.$id": routeAction1')
    expect(userCompanion.source).toContain('export const route = routes["users.$id"]')
    expect(result.artifacts.map((artifact) => artifact.kind)).toEqual([
      'routes',
      'controller',
      'companion',
      'companion',
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
    await writeFile(path.join(about, 'route.ts'), 'export const action = () => new Response()\n')
    let stale = await writeRouteArtifacts({ cwd, check: true })
    expect(stale.changed).toBe(true)
    expect(stale.artifacts.find((artifact) => artifact.kind === 'routes')?.changed).toBe(true)
  })

  it('removes only stale generated companions and protects user files', async () => {
    let cwd = await project()
    await writeRouteArtifacts({ cwd })
    let staleDirectory = path.join(cwd, 'app/routes/old')
    await mkdir(staleDirectory)
    let staleCompanion = path.join(staleDirectory, '+route.ts')
    await writeFile(staleCompanion, `${generatedFileHeader}\nexport {}\n`)

    let checked = await writeRouteArtifacts({ cwd, check: true })
    expect(checked.removed).toEqual([staleCompanion])
    await writeRouteArtifacts({ cwd })
    await expect(readFile(staleCompanion, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })

    let userCompanion = path.join(cwd, 'app/routes/users.$id/+route.ts')
    await writeFile(userCompanion, 'export const mine = true\n')
    await expect(writeRouteArtifacts({ cwd })).rejects.toThrow('Refusing to overwrite user-owned')

    await writeFile(userCompanion, `${generatedFileHeader}\nexport {}\n`)
    let routesOutput = path.join(cwd, 'app/routes.ts')
    await writeFile(routesOutput, 'export const handwritten = true\n')
    await expect(writeRouteArtifacts({ cwd })).rejects.toThrow(`user-owned file ${routesOutput}`)
  })

  it('supports custom outputs and validates export names and output syntax', async () => {
    let cwd = await project()
    let generated = await generateRouteArtifacts({
      cwd,
      routesOutput: 'generated/contract.js',
      controllerOutput: 'generated/controller.js',
      routesExportName: 'appRoutes',
      controllerExportName: 'appController',
    })
    let routes = generated.artifacts.find((artifact) => artifact.kind === 'routes')!
    let controller = generated.artifacts.find((artifact) => artifact.kind === 'controller')!
    expect(routes.source).not.toContain('as const')
    expect(controller.source).toContain('export const appController = createController(appRoutes')
    expect(generated.artifacts.find((artifact) => artifact.routeId === '_index')?.source).toContain(
      '../../../generated/contract.js',
    )

    await expect(generateRouteArtifacts({ cwd, routesExportName: 'not-valid' })).rejects.toThrow(
      'Invalid routes export name',
    )
    await expect(generateRouteArtifacts({ cwd, controllerOutput: 'controller.txt' })).rejects.toThrow(
      'must use .ts',
    )
  })
})
