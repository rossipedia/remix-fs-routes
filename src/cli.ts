#!/usr/bin/env node

import path from 'node:path'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { resolveOptions } from './convention.js'
import { watchRouteArtifacts, watchRouteTypes } from './watch.js'
import { writeRouteArtifacts, writeRouteTypes } from './write.js'
import type { WriteRouteArtifactsOptions, WriteRouteArtifactsResult } from './types.js'

interface CliOptions extends WriteRouteArtifactsOptions {
  watch?: boolean
  help?: boolean
  version?: boolean
  typegen?: boolean
}

export async function run(argv = process.argv.slice(2)): Promise<number> {
  let options: CliOptions
  try {
    options = parseArguments(argv)
  } catch (error) {
    console.error(formatError(error))
    console.error('Run remix-fs-routes --help for usage.')
    return 2
  }

  if (options.help) {
    console.log(help)
    return 0
  }
  if (options.version) {
    console.log('0.1.0')
    return 0
  }

  let printResult = (result: WriteRouteArtifactsResult) => {
    let cwd = options.cwd ?? process.cwd()
    for (let artifact of result.artifacts) {
      let relativeOutput = path.relative(cwd, artifact.output) || artifact.output
      if (options.check) {
        console.log(artifact.changed ? `outdated ${relativeOutput}` : `current ${relativeOutput}`)
      } else {
        console.log(
          artifact.changed ? `generated ${relativeOutput}` : `unchanged ${relativeOutput}`,
        )
      }
    }
    for (let output of result.removed) {
      let relativeOutput = path.relative(cwd, output) || output
      console.log(options.check ? `orphaned ${relativeOutput}` : `removed ${relativeOutput}`)
    }
  }

  try {
    if (options.watch) {
      let resolved = resolveOptions(options)
      let watch = options.typegen ? watchRouteTypes : watchRouteArtifacts
      let watcher = await watch(options, {
        onResult: printResult,
        onError(error) {
          console.error(formatError(error))
        },
      })
      console.log(`watching ${path.relative(resolved.cwd, resolved.rootDirectory)}`)
      await waitForShutdown()
      await watcher.close()
      return 0
    }

    let write = options.typegen ? writeRouteTypes : writeRouteArtifacts
    let result = await write(options)
    printResult(result)
    return options.check && result.changed ? 1 : 0
  } catch (error) {
    console.error(formatError(error))
    return 1
  }
}

function waitForShutdown(): Promise<void> {
  return new Promise((resolve) => {
    let close = () => {
      process.off('SIGINT', close)
      process.off('SIGTERM', close)
      resolve()
    }
    process.once('SIGINT', close)
    process.once('SIGTERM', close)
  })
}

export function parseArguments(argv: string[]): CliOptions {
  let options: CliOptions = {}
  for (let index = 0; index < argv.length; index++) {
    let argument = argv[index]
    switch (argument) {
      case 'generate':
        break
      case 'typegen':
        options.typegen = true
        break
      case '--app-directory':
      case '--app':
        options.appDirectory = readValue(argv, ++index, argument)
        break
      case '--root-directory':
      case '--root':
        options.rootDirectory = readValue(argv, ++index, argument)
        break
      case '--routes-output':
        options.routesOutput = readValue(argv, ++index, argument)
        break
      case '--controller-output':
        options.controllerOutput = readValue(argv, ++index, argument)
        break
      case '--typegen-directory':
        options.typegenDirectory = readValue(argv, ++index, argument)
        break
      case '--ignore':
        ;(options.ignoredRouteFiles ??= []).push(readValue(argv, ++index, argument))
        break
      case '--routes-export':
        options.routesExportName = readValue(argv, ++index, argument)
        break
      case '--controller-export':
        options.controllerExportName = readValue(argv, ++index, argument)
        break
      case '--cwd':
        options.cwd = readValue(argv, ++index, argument)
        break
      case '--check':
        options.check = true
        break
      case '--watch':
      case '-w':
        options.watch = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
      case '--version':
      case '-v':
        options.version = true
        break
      default:
        throw new Error(`Unknown argument: ${argument}`)
    }
  }
  if (options.check && options.watch)
    throw new Error('--check and --watch cannot be used together.')
  return options
}

function readValue(argv: string[], index: number, option: string): string {
  let value = argv[index]
  if (!value || value.startsWith('-')) throw new Error(`${option} requires a value.`)
  return value
}

function formatError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

const help = `Usage: remix-fs-routes [generate|typegen] [options]

Generate Remix 3 route companions, a route map, and a controller from route folders.

Commands:
  generate                        Generate runtime modules and virtual declarations (default)
  typegen                         Generate only virtual-module declarations

Options:
  --app, --app-directory <dir>    App directory (default: app)
  --root, --root-directory <dir>  Routes directory relative to app (default: routes)
  --routes-output <file>          Generated route map (default: app/routes.ts)
  --controller-output <file>      Generated controller (default: app/routes.controller.ts)
  --typegen-directory <dir>       Virtual declarations directory (default: .remix-fs-routes/types)
  --ignore <glob>                 Ignore route files; repeatable
  --routes-export <name>          Route map export name (default: routes)
  --controller-export <name>      Controller export name (default: controller)
  --cwd <dir>                     Project directory (default: current directory)
  --check                         Exit 1 when generated output is stale
  -w, --watch                     Regenerate when route files change
  -h, --help                      Show help
  -v, --version                   Show version`

export function isMainModule(moduleUrl: string, argvEntry: string | undefined): boolean {
  if (!argvEntry) return false
  try {
    return realpathSync(argvEntry) === realpathSync(fileURLToPath(moduleUrl))
  } catch {
    return false
  }
}

if (isMainModule(import.meta.url, process.argv[1])) {
  process.exitCode = await run()
}
