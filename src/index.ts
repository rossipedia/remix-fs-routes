export {
  RouteConventionError,
  parseRouteSegments,
  resolveOptions,
  scanRoutes,
} from './convention.js'
export type { ParsedSegment } from './convention.js'
export { generateRouteArtifacts, generatedFileHeader } from './generate.js'
export { ignoreGeneratedOutputs, writeRouteArtifacts, writeRouteTypes } from './write.js'
export { watchRouteArtifacts, watchRouteTypes } from './watch.js'
export type {
  RouteArtifactsWatcher,
  WatchRouteArtifactsHandlers,
  WatchRouteArtifactsOptions,
} from './watch.js'
export { routeModuleExtensions } from './types.js'
export type {
  FileSystemRoutesOptions,
  GenerateRouteArtifactsOptions,
  GenerateRouteArtifactsResult,
  GeneratedRouteArtifact,
  GeneratedRouteArtifactKind,
  RemixFsRoutesPluginOptions,
  ResolvedFileSystemRoutesOptions,
  RouteManifest,
  RouteManifestEntry,
  WriteRouteArtifactsOptions,
  WriteRouteArtifactsResult,
  WrittenRouteArtifact,
} from './types.js'

// foo
