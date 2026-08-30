import path from 'node:path'
import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'

import { minimatch } from 'minimatch'

import {
  routeModuleExtensions,
  type FileSystemRoutesOptions,
  type ResolvedFileSystemRoutesOptions,
  type RouteManifest,
  type RouteManifestEntry,
} from './types.js'

type ParserState = 'normal' | 'escape' | 'optional' | 'optionalEscape'

export interface ParsedSegment {
  value: string
  raw: string
  optional: boolean
  pathless: boolean
}

interface Candidate {
  absoluteFile: string
  file: string
  id: string
}

export class RouteConventionError extends Error {
  override name = 'RouteConventionError'
}

export function resolveOptions(
  options: FileSystemRoutesOptions = {},
): ResolvedFileSystemRoutesOptions {
  let cwd = path.resolve(options.cwd ?? process.cwd())
  let appDirectory = path.resolve(cwd, options.appDirectory ?? 'app')
  let rootDirectory = path.resolve(appDirectory, options.rootDirectory ?? 'routes')

  return {
    cwd,
    appDirectory,
    rootDirectory,
    ignoredRouteFiles: options.ignoredRouteFiles ?? [],
  }
}

export async function scanRoutes(options: FileSystemRoutesOptions = {}): Promise<RouteManifest> {
  let resolved = resolveOptions(options)
  let candidates = await findRouteModules(resolved)
  let entries = buildManifestEntries(candidates)

  return {
    routes: entries,
    appDirectory: toPosix(path.relative(resolved.cwd, resolved.appDirectory)) || '.',
    rootDirectory: toPosix(path.relative(resolved.cwd, resolved.rootDirectory)) || '.',
  }
}

async function findRouteModules(options: ResolvedFileSystemRoutesOptions): Promise<Candidate[]> {
  let directoryEntries
  try {
    directoryEntries = await readdir(options.rootDirectory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }

  let candidates: Candidate[] = []
  for (let entry of directoryEntries.sort((a, b) => a.name.localeCompare(b.name))) {
    let absoluteEntry = path.join(options.rootDirectory, entry.name)
    if (isIgnored(absoluteEntry, options)) continue

    if (entry.isFile() && isRouteModule(entry.name)) {
      throw new RouteConventionError(
        `Route module ${displayPath(absoluteEntry, options.cwd)} must be placed in a route folder.`,
      )
    }

    if (!entry.isDirectory()) continue

    let children = await readdir(absoluteEntry, { withFileTypes: true })
    let actionsFiles = findNamedRouteModules(children, 'actions')
    if (actionsFiles.length > 1) {
      throw new RouteConventionError(
        `Route folder ${displayPath(absoluteEntry, options.cwd)} contains multiple "actions" modules: ${actionsFiles.join(', ')}.`,
      )
    }

    let controllerFiles = findNamedRouteModules(children, 'controller')
    if (controllerFiles.length > 0) {
      throw new RouteConventionError(
        `Route folder ${displayPath(absoluteEntry, options.cwd)} uses ${controllerFiles.join(', ')}; move the controller to a named "controller" export in its actions module.`,
      )
    }

    let legacyFiles = [
      ...findNamedRouteModules(children, 'action'),
      ...findNamedRouteModules(children, 'route'),
      ...findNamedRouteModules(children, 'index'),
    ]
    if (legacyFiles.length > 0) {
      let actionsFilenames = routeModuleExtensions
        .map((extension) => `actions${extension}`)
        .join(', ')
      throw new RouteConventionError(
        `Route folder ${displayPath(absoluteEntry, options.cwd)} uses ${legacyFiles.join(', ')}; rename the route module to one of: ${actionsFilenames}.`,
      )
    }

    let moduleName = actionsFiles[0]
    if (moduleName) {
      let absoluteFile = path.join(absoluteEntry, moduleName)
      if (!isIgnored(absoluteFile, options)) {
        candidates.push(candidateFromFile(absoluteFile, options))
      }
    }
  }

  return candidates
}

function candidateFromFile(
  absoluteFile: string,
  options: ResolvedFileSystemRoutesOptions,
): Candidate {
  let relativeToApp = toPosix(path.relative(options.appDirectory, absoluteFile))
  let relativeToRoutes = toPosix(path.relative(options.rootDirectory, absoluteFile))
  let id = toPosix(path.dirname(relativeToRoutes))

  return { absoluteFile, file: relativeToApp, id }
}

function buildManifestEntries(candidates: Candidate[]): RouteManifestEntry[] {
  let byId = uniqueCandidates(candidates, 'Route')
  let ids = [...byId.keys()].sort((a, b) => a.localeCompare(b))
  let entries = ids.map((id) => createManifestEntry(byId.get(id)!, ids))
  let routablePaths = new Map<string, RouteManifestEntry>()

  for (let entry of entries) {
    let conflict = routablePaths.get(entry.pattern)
    if (conflict) {
      throw new RouteConventionError(
        `Route path collision for "${entry.pattern}": ${conflict.file} and ${entry.file}.`,
      )
    }
    routablePaths.set(entry.pattern, entry)
  }

  return entries
}

function uniqueCandidates(candidates: Candidate[], label: string): Map<string, Candidate> {
  let byId = new Map<string, Candidate>()
  for (let candidate of candidates) {
    let conflict = byId.get(candidate.id)
    if (conflict) {
      throw new RouteConventionError(
        `${label} id collision for "${candidate.id}": ${conflict.file} and ${candidate.file}.`,
      )
    }
    byId.set(candidate.id, candidate)
  }

  return byId
}

function createManifestEntry(candidate: Candidate, ids: string[]): RouteManifestEntry {
  let segments = parseRouteSegments(candidate.id)
  let trailingSlash = segments.at(-1)?.raw === '_index'
  for (let [segmentIndex, segment] of segments.entries()) {
    if (segment.raw === '_index' && segmentIndex !== segments.length - 1) {
      throw new RouteConventionError(
        `Route folder "${candidate.id}" uses _index before the final segment. _index is only supported as the final route segment.`,
      )
    }
  }
  let routeSegments = (trailingSlash ? segments.slice(0, -1) : segments).filter(
    (segment) => !segment.pathless,
  )
  let pathValue = routeSegments.map(toReactRouterSegment).filter(Boolean).join('/')
  let pattern = toRemixPattern(routeSegments)
  if (trailingSlash && pattern !== '/') {
    pathValue += '/'
    pattern += '/'
  }

  return {
    id: candidate.id,
    file: candidate.file,
    path: pathValue || undefined,
    pattern,
    parentId: findParentId(candidate.id, ids),
    trailingSlash,
    controllerIds: findControllerIds(candidate.id, ids),
  }
}

export function parseRouteSegments(routeId: string): ParsedSegment[] {
  let segments: ParsedSegment[] = []
  let value = ''
  let raw = ''
  let optional = false
  let state: ParserState = 'normal'

  let push = () => {
    if (!value && !raw) return
    if (state !== 'normal') {
      throw new RouteConventionError(`Unclosed route segment syntax in "${routeId}".`)
    }
    if (/[/:*]/.test(raw.replace(/\[[^\]]*\]/g, ''))) {
      throw new RouteConventionError(
        `Route segment "${raw}" in "${routeId}" contains a reserved character. Escape literals with brackets.`,
      )
    }
    let pathless = raw.startsWith('_') && raw !== '_index'
    if (!pathless && raw.endsWith('_') && value.endsWith('_')) value = value.slice(0, -1)
    segments.push({ value, raw, optional, pathless })
    value = ''
    raw = ''
    optional = false
  }

  for (let index = 0; index < routeId.length; index++) {
    let character = routeId[index]
    if (state === 'normal') {
      if (character === '.' || character === '/' || character === '\\') {
        push()
      } else if (character === '[') {
        raw += character
        state = 'escape'
      } else if (character === '(') {
        raw += character
        optional = true
        state = 'optional'
      } else if (character === '$' && value === '') {
        raw += character
        value += index === routeId.length - 1 || isSeparator(routeId[index + 1]) ? '*' : ':'
      } else {
        raw += character
        value += character
      }
    } else if (state === 'escape' || state === 'optionalEscape') {
      raw += character
      if (character === ']') {
        state = state === 'escape' ? 'normal' : 'optional'
      } else {
        value += character
      }
    } else if (state === 'optional') {
      raw += character
      if (character === ')') {
        state = 'normal'
      } else if (character === '[') {
        state = 'optionalEscape'
      } else if (character === '$' && value === '') {
        value += ':'
      } else {
        value += character
      }
    }
  }
  push()
  return segments
}

function toReactRouterSegment(segment: ParsedSegment): string {
  return segment.optional ? `${segment.value}?` : segment.value
}

function toRemixPattern(segments: ParsedSegment[]): string {
  if (segments.length === 0) return '/'
  let pattern = ''
  let leadingOptionals = true
  for (let index = 0; index < segments.length; index++) {
    let segment = segments[index]
    let value = escapeRemixLiterals(segment.value, segment.raw)
    if (index === 0) {
      pattern += segment.optional
        ? index === segments.length - 1
          ? `(${value})`
          : `(${value}/)`
        : `/${value}`
    } else if (leadingOptionals && segment.optional) {
      pattern += index === segments.length - 1 ? `(${value})` : `(${value}/)`
    } else if (leadingOptionals) {
      pattern += value
    } else {
      pattern += segment.optional ? `(/${value})` : `/${value}`
    }
    if (!segment.optional) leadingOptionals = false
  }
  return pattern || '/'
}

function escapeRemixLiterals(value: string, raw: string): string {
  let result = ''
  let valueIndex = 0
  let state: 'normal' | 'escape' = 'normal'

  for (let index = 0; index < raw.length && valueIndex < value.length; index++) {
    let character = raw[index]
    if (state === 'normal' && (character === '(' || character === ')')) continue
    if (state === 'normal' && character === '[') {
      state = 'escape'
      continue
    }
    if (state === 'escape' && character === ']') {
      state = 'normal'
      continue
    }
    if (character === '$' && value[valueIndex] === ':') {
      result += ':'
      valueIndex++
      continue
    }
    let decoded = value[valueIndex++]
    result += state === 'escape' && /[:*()\\]/.test(decoded) ? `\\${decoded}` : decoded
  }

  return result + value.slice(valueIndex)
}

function findParentId(routeId: string, ids: string[]): string | undefined {
  let matches = ids.filter(
    (candidate) =>
      candidate !== routeId &&
      routeId.startsWith(candidate) &&
      ['.', '/'].includes(routeId[candidate.length] ?? ''),
  )
  return matches.sort((a, b) => b.length - a.length)[0]
}

function findControllerIds(routeId: string, ids: string[]): string[] {
  return ids
    .filter(
      (candidate) =>
        candidate === routeId ||
        (routeId.startsWith(candidate) && ['.', '/'].includes(routeId[candidate.length] ?? '')),
    )
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
}

function findNamedRouteModules(entries: Dirent<string>[], basename: string): string[] {
  let matches: string[] = []
  for (let extension of routeModuleExtensions) {
    let filename = `${basename}${extension}`
    if (entries.some((entry) => entry.isFile() && entry.name === filename)) matches.push(filename)
  }
  return matches
}

function isRouteModule(filename: string): boolean {
  return routeModuleExtensions.includes(
    path.extname(filename) as (typeof routeModuleExtensions)[number],
  )
}

function isIgnored(absolutePath: string, options: ResolvedFileSystemRoutesOptions): boolean {
  let appRelative = toPosix(path.relative(options.appDirectory, absolutePath))
  let routesRelative = toPosix(path.relative(options.rootDirectory, absolutePath))
  if (routesRelative.split('/').some((part) => part.startsWith('.'))) return true
  return options.ignoredRouteFiles.some(
    (pattern) =>
      minimatch(appRelative, pattern, { dot: true }) ||
      minimatch(routesRelative, pattern, { dot: true }),
  )
}

function isSeparator(character: string | undefined): boolean {
  return character === '.' || character === '/' || character === '\\'
}

function displayPath(absolutePath: string, cwd: string): string {
  return toPosix(path.relative(cwd, absolutePath))
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}
