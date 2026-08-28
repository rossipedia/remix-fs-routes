import { describe, expect, it } from 'vitest'

import { isMainModule, parseArguments } from '../src/cli.js'

describe('CLI argument parsing', () => {
  it('accepts generation, watch, and repeated ignore options', () => {
    expect(
      parseArguments([
        'generate',
        '--app',
        'src',
        '--root',
        'pages',
        '--ignore',
        '**/*.test.ts',
        '--ignore',
        '**/*.css',
        '--routes-output',
        'src/routes.ts',
        '--controller-output',
        'src/routes.controller.ts',
        '--routes-export',
        'appRoutes',
        '--controller-export',
        'appController',
        '--watch',
      ]),
    ).toEqual({
      appDirectory: 'src',
      rootDirectory: 'pages',
      ignoredRouteFiles: ['**/*.test.ts', '**/*.css'],
      routesOutput: 'src/routes.ts',
      controllerOutput: 'src/routes.controller.ts',
      routesExportName: 'appRoutes',
      controllerExportName: 'appController',
      watch: true,
    })
  })

  it('rejects incompatible and unknown options', () => {
    expect(() => parseArguments(['--watch', '--check'])).toThrow()
    expect(() => parseArguments(['--wat'])).toThrow('Unknown argument')
  })

  it('supports declaration-only generation', () => {
    expect(parseArguments(['typegen', '--typegen-directory', '.cache/routes', '--watch'])).toEqual({
      typegen: true,
      typegenDirectory: '.cache/routes',
      watch: true,
    })
  })

  it('recognizes an npm-style symlink as the executable entry', async () => {
    let directory = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-bin-'))
    let entry = path.join(directory, 'remix-fs-routes')
    await symlink(fileURLToPath(import.meta.url), entry)

    expect(isMainModule(import.meta.url, process.argv[1])).toBe(false)
    expect(isMainModule(import.meta.url, entry)).toBe(true)
  })
})
import path from 'node:path'
import { mkdtemp, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
