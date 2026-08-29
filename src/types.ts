export const routeModuleExtensions = [
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
] as const

export interface FileSystemRoutesOptions {
  /** Application directory, relative to `cwd`. Defaults to `app`. */
  appDirectory?: string
  /** Routes directory, relative to `appDirectory`. Defaults to `routes`. */
  rootDirectory?: string
  /** Minimatch globs matched against both app-relative and routes-relative paths. */
  ignoredRouteFiles?: string[]
  /** Directory used to resolve relative paths. Defaults to `process.cwd()`. */
  cwd?: string
}

export interface ResolvedFileSystemRoutesOptions {
  appDirectory: string
  rootDirectory: string
  ignoredRouteFiles: string[]
  cwd: string
}

export interface RouteManifestEntry {
  /** Stable route id derived from the route folder name. */
  id: string
  /** Route module path relative to the application directory. */
  file: string
  /** Pathname produced by the supported flat-route folder-name convention. */
  path?: string
  /** Native Remix 3 route pattern. */
  pattern: string
  /** Parent route id according to the flat-route naming convention. */
  parentId?: string
  /** Whether a final `_index` segment adds a required trailing slash. */
  trailingSlash: boolean
}

export interface RouteManifest {
  routes: RouteManifestEntry[]
  appDirectory: string
  rootDirectory: string
}

export interface GenerateRouteArtifactsOptions extends FileSystemRoutesOptions {
  /** Generated route-map path, relative to `cwd`. Defaults to `app/routes.ts`. */
  routesOutput?: string
  /** Generated controller path, relative to `cwd`. Defaults to `app/routes.controller.ts`. */
  controllerOutput?: string
  /** Export name for the Remix route map. Defaults to `routes`. */
  routesExportName?: string
  /** Export name for the Remix controller. Defaults to `controller`. */
  controllerExportName?: string
  /** Generated virtual-module declarations, relative to `cwd`. Defaults to `.remix-fs-routes/types`. */
  typegenDirectory?: string
}

export type GeneratedRouteArtifactKind =
  | 'routes'
  | 'controller'
  | 'route-module'
  | 'route-support'
  | 'virtual-types'

export interface GeneratedRouteArtifact {
  kind: GeneratedRouteArtifactKind
  /** Absolute output path. */
  output: string
  source: string
  routeId?: string
}

export interface GenerateRouteArtifactsResult {
  artifacts: GeneratedRouteArtifact[]
  manifest: RouteManifest
}

export interface WriteRouteArtifactsOptions extends GenerateRouteArtifactsOptions {
  /** Check whether all generated artifacts are current without writing them. */
  check?: boolean
}

export interface WrittenRouteArtifact extends GeneratedRouteArtifact {
  changed: boolean
}

export interface WriteRouteArtifactsResult {
  changed: boolean
  artifacts: WrittenRouteArtifact[]
  /** Stale generated declarations and legacy companions removed, or reported by check mode. */
  removed: string[]
  manifest: RouteManifest
}

export interface RemixFsRoutesPluginOptions extends GenerateRouteArtifactsOptions {
  /** Virtual route-map module id. Defaults to `virtual:remix-fs-routes/routes`. */
  routesVirtualModuleId?: string
  /** Virtual controller module id. Defaults to `virtual:remix-fs-routes/controller`. */
  controllerVirtualModuleId?: string
}
