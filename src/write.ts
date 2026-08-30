import path from 'node:path'
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'

import { resolveOptions } from './convention.js'
import {
  generateRouteArtifacts,
  generatedFileHeader,
  getRouteSupportOutput,
  getRouteSupportTypesOutput,
} from './generate.js'
import type {
  GenerateRouteArtifactsOptions,
  GenerateRouteArtifactsResult,
  GeneratedRouteArtifact,
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
  return writeGeneratedArtifacts(options, generated, () => true)
}

export async function writeRouteTypes(
  options: WriteRouteArtifactsOptions = {},
): Promise<WriteRouteArtifactsResult> {
  let generationOptions = ignoreGeneratedOutputs(options)
  let generated = await generateRouteArtifacts(generationOptions)
  return writeGeneratedRouteTypes(options, generated)
}

export function writeGeneratedRouteTypes(
  options: WriteRouteArtifactsOptions,
  generated: GenerateRouteArtifactsResult,
): Promise<WriteRouteArtifactsResult> {
  return writeGeneratedArtifacts(options, generated, isTypeArtifact)
}

async function writeGeneratedArtifacts(
  options: WriteRouteArtifactsOptions,
  generated: GenerateRouteArtifactsResult,
  include: (artifact: GeneratedRouteArtifact) => boolean,
): Promise<WriteRouteArtifactsResult> {
  let artifacts: WrittenRouteArtifact[] = []

  for (let artifact of generated.artifacts.filter(include)) {
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

  let expectedTypes = new Set(
    generated.artifacts.filter(isTypeArtifact).map((artifact) => path.resolve(artifact.output)),
  )
  let expectedCompanions = new Set(
    generated.artifacts
      .filter((artifact) => artifact.kind === 'route-module')
      .map((artifact) => path.resolve(artifact.output)),
  )
  let includesCompanions = generated.artifacts.some(
    (artifact) => artifact.kind === 'route-module' && include(artifact),
  )
  let removed = [
    ...(await findStaleRouteTypes(options, expectedTypes)),
    ...(includesCompanions ? await findStaleCompanions(options, expectedCompanions) : []),
  ].sort((a, b) => a.localeCompare(b))
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

function isTypeArtifact(artifact: GeneratedRouteArtifact): boolean {
  return artifact.kind === 'virtual-types'
}

export function ignoreGeneratedOutputs<T extends GenerateRouteArtifactsOptions>(options: T): T {
  let resolved = resolveOptions(options)
  let outputs = [
    path.resolve(resolved.cwd, options.routesOutput ?? 'app/routes.ts'),
    path.resolve(resolved.cwd, options.controllerOutput ?? 'app/routes.controller.ts'),
  ]
  outputs.push(getRouteSupportOutput(outputs[0]))
  outputs.push(getRouteSupportTypesOutput(outputs[0]))
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

async function findStaleRouteTypes(
  options: GenerateRouteArtifactsOptions,
  expected: Set<string>,
): Promise<string[]> {
  let resolved = resolveOptions(options)
  let typegenDirectory = path.resolve(
    resolved.cwd,
    options.typegenDirectory ?? '.remix-fs-routes/types',
  )
  let candidates = await findGeneratedTypeFiles(typegenDirectory)
  let stale: string[] = []
  for (let candidate of candidates) {
    if (expected.has(path.resolve(candidate))) continue
    let source = await readOptionalFile(candidate)
    if (source?.startsWith(generatedFileHeader)) stale.push(candidate)
  }
  return stale.sort((a, b) => a.localeCompare(b))
}

async function findGeneratedTypeFiles(directory: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  let files: string[] = []
  for (let entry of entries) {
    let candidate = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await findGeneratedTypeFiles(candidate)))
    } else if (
      entry.isFile() &&
      (entry.name === 'virtual.d.ts' ||
        (path.basename(directory) === '+types' && entry.name.endsWith('.d.ts')))
    ) {
      files.push(candidate)
    }
  }
  return files
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
  let legacy: string[] = []
  for (let directory of directories) {
    if (!directory.isDirectory()) continue
    for (let filename of ['+route.ts', '+controller.ts']) {
      let candidate = path.join(rootDirectory, directory.name, filename)
      if (expected.has(path.resolve(candidate))) continue
      let source = await readOptionalFile(candidate)
      if (source?.startsWith(generatedFileHeader)) legacy.push(candidate)
    }
  }
  return legacy
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
