import path from 'node:path'
import { mkdir, mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'

import {
  watchRouteArtifacts,
  watchRouteTypes,
  type WriteRouteArtifactsResult,
} from '../src/index.js'

describe('watchRouteArtifacts', () => {
  it('supports virtual-declaration-only watch mode', async () => {
    let cwd = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-type-watch-'))
    let indexDirectory = path.join(cwd, 'app/routes/_index')
    await mkdir(indexDirectory, { recursive: true })
    await writeFile(path.join(indexDirectory, 'action.ts'), 'export default () => new Response()\n')

    let watcher = await watchRouteTypes({ cwd, pollingIntervalMs: 20 })
    try {
      await expect(readFile(path.join(cwd, 'app/routes.ts'), 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      })
      expect(await readFile(
        path.join(cwd, '.remix-fs-routes/types/virtual.d.ts'),
        'utf8',
      )).toContain('readonly "_index": Route<\'ANY\', "/">')
    } finally {
      await watcher.close()
    }
  })

  it('reconciles route additions and removals without overlapping writes', async () => {
    let cwd = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-watch-'))
    let indexDirectory = path.join(cwd, 'app/routes/_index')
    await mkdir(indexDirectory, { recursive: true })
    await writeFile(path.join(indexDirectory, 'action.ts'), 'export default () => new Response()\n')

    let waitForResult: ((result: WriteRouteArtifactsResult) => boolean) | undefined
    let resolveResult: ((result: WriteRouteArtifactsResult) => void) | undefined
    let resultTimer: NodeJS.Timeout | undefined
    let watcher = await watchRouteArtifacts(
      { cwd, debounceMs: 10, pollingIntervalMs: 20 },
      {
        onResult(result) {
          if (waitForResult?.(result)) {
            waitForResult = undefined
            clearTimeout(resultTimer)
            resolveResult?.(result)
          }
        },
        onError(error) {
          throw error
        },
      },
    )

    let nextResult = (predicate: (result: WriteRouteArtifactsResult) => boolean) =>
      new Promise<WriteRouteArtifactsResult>((resolve, reject) => {
        waitForResult = predicate
        resolveResult = resolve
        resultTimer = setTimeout(
          () => reject(new Error('Timed out waiting for route generation.')),
          5_000,
        )
      })

    try {
      let aboutDirectory = path.join(cwd, 'app/routes/about')
      let aboutModule = path.join(aboutDirectory, 'action.ts')
      let added = nextResult((result) => result.manifest.routes.some((route) => route.id === 'about'))
      await mkdir(aboutDirectory)
      await writeFile(aboutModule, 'export default () => new Response()\n')
      await added
      expect(await readFile(path.join(cwd, 'app/routes.ts'), 'utf8')).toContain('"about": "/about"')
      let aboutCompanion = path.join(cwd, 'app/routes/about/+route.ts')
      expect(await readFile(aboutCompanion, 'utf8')).toContain('routes["about"]')

      let removed = nextResult(
        (result) => !result.manifest.routes.some((route) => route.id === 'about'),
      )
      await unlink(aboutModule)
      await removed
      expect(await readFile(path.join(cwd, 'app/routes.ts'), 'utf8')).not.toContain('"about"')
      await expect(readFile(aboutCompanion, 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      })
    } finally {
      await watcher.close()
    }
  })

  it('stays active after a convention error and recovers when the route tree is fixed', async () => {
    let cwd = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-watch-recovery-'))
    let routesDirectory = path.join(cwd, 'app/routes')
    let invalidModule = path.join(routesDirectory, 'about.ts')
    await mkdir(routesDirectory, { recursive: true })
    await writeFile(invalidModule, 'export default () => new Response()\n')

    let errors: unknown[] = []
    let resolveRecovery: (() => void) | undefined
    let recoveryTimer: NodeJS.Timeout | undefined
    let recovered = new Promise<void>((resolve, reject) => {
      resolveRecovery = () => {
        clearTimeout(recoveryTimer)
        resolve()
      }
      recoveryTimer = setTimeout(
        () => reject(new Error('Timed out waiting for watcher recovery.')),
        5_000,
      )
    })
    let watcher = await watchRouteArtifacts(
      { cwd, debounceMs: 10, pollingIntervalMs: 20 },
      {
        onResult(result) {
          if (result.manifest.routes.some((route) => route.id === 'about')) resolveRecovery?.()
        },
        onError(error) {
          errors.push(error)
        },
      },
    )

    try {
      expect(errors).toHaveLength(1)
      await unlink(invalidModule)
      let aboutDirectory = path.join(routesDirectory, 'about')
      await mkdir(aboutDirectory)
      await writeFile(
        path.join(aboutDirectory, 'action.ts'),
        'export default () => new Response()\n',
      )
      await recovered
      expect(await readFile(path.join(cwd, 'app/routes.ts'), 'utf8')).toContain('"about": "/about"')
    } finally {
      await watcher.close()
    }
  })
})
