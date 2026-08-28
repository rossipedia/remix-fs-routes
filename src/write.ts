import path from 'node:path'
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'

import { resolveOptions } from './convention.js'
import { generateRouteArtifacts, generatedFileHeader } from './generate.js'
import type {
  GenerateRouteArtifactsOptions,
  WriteRouteArtifactsOptions,
  WriteRouteArtifactsResult,
  WrittenRouteArtifact,
} from './types.js'

let temporaryFileSequence = 0

export async function writeRouteArtifacts(
  options: WriteRouteArtifactsOptions = {},
): Promise<WriteRouteArtifactsResult> {
  let generationOptions = ignoreGeneratedOutputs(options)
  let generated = await generateRouteArtifacts(generationOptions)
  let artifacts: WrittenRouteArtifact[] = []

  for (let artifact of generated.artifacts) {
    let current = await readOptionalFile(artifact.output)
    if (
      current !== undefined &&
      current !== artifact.source &&
      !current.startsWith(generatedFileHeader)
    ) {
      throw new Error(`Refusing to overwrite user-owned file ${artifact.output}.`)
    }
    let changed = current !== artifact.source
    artifacts.push({ ...artifact, changed })
  }

  if (!options.check) {
    for (let artifact of artifacts) {
      if (artifact.changed) await writeAtomic(artifact.output, artifact.source)
    }
  }

  let expectedCompanions = new Set(
    generated.artifacts
      .filter((artifact) => artifact.kind === 'companion')
      .map((artifact) => path.resolve(artifact.output)),
  )
  let removed = await findStaleCompanions(options, expectedCompanions)
  if (!options.check) {
    for (let output of removed) await unlink(output)
  }

  return {
    changed: artifacts.some((artifact) => artifact.changed) || removed.length > 0,
    artifacts,
    removed,
    manifest: generated.manifest,
  }
}

export function ignoreGeneratedOutputs<T extends GenerateRouteArtifactsOptions>(options: T): T {
  let resolved = resolveOptions(options)
  let outputs = [
    path.resolve(resolved.cwd, options.routesOutput ?? 'app/routes.ts'),
    path.resolve(resolved.cwd, options.controllerOutput ?? 'app/routes.controller.ts'),
  ]
  let patterns = outputs.flatMap((output) => {
    let relative = path.relative(resolved.rootDirectory, output)
    return relative.startsWith('..') || path.isAbsolute(relative)
      ? []
      : [relative.split(path.sep).join('/')]
  })
  return {
    ...options,
    ignoredRouteFiles: [...new Set([...(options.ignoredRouteFiles ?? []), ...patterns])],
  }
}

async function findStaleCompanions(
  options: GenerateRouteArtifactsOptions,
  expected: Set<string>,
): Promise<string[]> {
  let { rootDirectory } = resolveOptions(options)
  let directories
  try {
    directories = await readdir(rootDirectory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  let stale: string[] = []
  for (let directory of directories) {
    if (!directory.isDirectory()) continue
    let candidate = path.join(rootDirectory, directory.name, '+route.ts')
    if (expected.has(path.resolve(candidate))) continue
    let source = await readOptionalFile(candidate)
    if (source?.startsWith(generatedFileHeader)) stale.push(candidate)
  }
  return stale.sort((a, b) => a.localeCompare(b))
}

async function writeAtomic(output: string, source: string): Promise<void> {
  await mkdir(path.dirname(output), { recursive: true })
  let temporary = `${output}.${process.pid}.${++temporaryFileSequence}.tmp`
  try {
    await writeFile(temporary, source, 'utf8')
    await rename(temporary, output)
  } catch (error) {
    await unlink(temporary).catch(() => {})
    throw error
  }
}

async function readOptionalFile(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}
