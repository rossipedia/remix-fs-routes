import path from 'node:path'

import { createUnplugin, type UnpluginBuildContext, type UnpluginFactory } from 'unplugin'

import { resolveOptions } from './convention.js'
import { generateRouteArtifacts, generatedFileHeader } from './generate.js'
import { ignoreGeneratedOutputs, writeRouteArtifacts } from './write.js'
import type {
  GenerateRouteArtifactsResult,
  RemixFsRoutesPluginOptions,
  RouteManifestEntry,
} from './types.js'

export const defaultRoutesVirtualModuleId = 'virtual:remix-fs-routes/routes'
export const defaultControllerVirtualModuleId = 'virtual:remix-fs-routes/controller'

export const unpluginFactory: UnpluginFactory<RemixFsRoutesPluginOptions | undefined> = (
  userOptions = {},
  meta,
) => {
  let options = { ...userOptions }
  let routesVirtualModuleId = options.routesVirtualModuleId ?? defaultRoutesVirtualModuleId
  let controllerVirtualModuleId =
    options.controllerVirtualModuleId ?? defaultControllerVirtualModuleId
  let resolvedRoutesVirtualModuleId = `\0${routesVirtualModuleId}`
  let resolvedControllerVirtualModuleId = `\0${controllerVirtualModuleId}`
  let resolved = resolveOptions(options)
  let generated: GenerateRouteArtifactsResult | undefined
  let virtualCompanions = new Map<string, string>()
  let generatedFingerprint: string | undefined
  let refreshPromise:
    | Promise<{ generated: GenerateRouteArtifactsResult; changed: boolean }>
    | undefined
  let refreshPending = false
  let invalidateVite: ((moduleIds: string[]) => void) | undefined

  let refresh = async () => {
    if (options.write === false) {
      generated = await generateRouteArtifacts(ignoreGeneratedOutputs(options))
    } else {
      generated = await writeRouteArtifacts(ignoreGeneratedOutputs(options))
    }
    let nextFingerprint = fingerprint(generated)
    let changed = generatedFingerprint !== nextFingerprint
    generatedFingerprint = nextFingerprint
    virtualCompanions.clear()
    return { generated, changed }
  }

  let queueRefresh = () => {
    if (refreshPromise) {
      refreshPending = true
    } else {
      refreshPromise = (async () => {
        let result
        do {
          refreshPending = false
          result = await refresh()
        } while (refreshPending)
        return result
      })().finally(() => {
        refreshPromise = undefined
      })
    }
    return refreshPromise
  }

  let requireGenerated = async () => generated ?? (await queueRefresh()).generated

  return {
    name: 'remix-fs-routes',
    async buildStart() {
      let { generated: result } = await queueRefresh()
      if (meta.framework !== 'esbuild') addWatchFiles(this, result, resolved)
    },
    async resolveId(id, importer) {
      if (id === routesVirtualModuleId) return resolvedRoutesVirtualModuleId
      if (id === controllerVirtualModuleId) return resolvedControllerVirtualModuleId
      if (options.write !== false || !importer || !isCompanionImport(id)) return undefined

      let result = await requireGenerated()
      let importerPath = cleanModuleId(importer)
      let entry = result.manifest.routes.find(
        (route) => path.resolve(resolved.appDirectory, route.file) === importerPath,
      )
      if (!entry) return undefined
      let virtualId = `\0remix-fs-routes:companion:${encodeURIComponent(entry.id)}`
      virtualCompanions.set(
        virtualId,
        generateVirtualCompanionSource(routesVirtualModuleId, options.routesExportName ?? 'routes', entry),
      )
      return virtualId
    },
    loadInclude(id) {
      return id === resolvedRoutesVirtualModuleId ||
        id === resolvedControllerVirtualModuleId ||
        virtualCompanions.has(id)
    },
    async load(id) {
      let result: GenerateRouteArtifactsResult | undefined
      if (id === resolvedRoutesVirtualModuleId) {
        result = await requireGenerated()
        addWatchFiles(this, result, resolved)
        return artifactSource(result, 'routes')
      }
      if (id === resolvedControllerVirtualModuleId) {
        result = await requireGenerated()
        addWatchFiles(this, result, resolved)
        return generateVirtualControllerSource(
          result,
          resolved.appDirectory,
          routesVirtualModuleId,
          options.routesExportName ?? 'routes',
          options.controllerExportName ?? 'controller',
        )
      }
      return virtualCompanions.get(id)
    },
    async watchChange(id) {
      let file = cleanModuleId(id)
      if (!isWatchedRouteFile(file, resolved.rootDirectory)) return

      let previousCompanions = [...virtualCompanions.keys()]
      let result = await queueRefresh()
      addWatchFiles(this, result.generated, resolved)
      if (result.changed) {
        invalidateVite?.([
          resolvedRoutesVirtualModuleId,
          resolvedControllerVirtualModuleId,
          ...previousCompanions,
        ])
      }
    },
    vite: {
      configureServer(server) {
        invalidateVite = (moduleIds) => {
          for (let id of moduleIds) {
              let module = server.moduleGraph.getModuleById(id)
              if (module) server.moduleGraph.invalidateModule(module)
          }
          server.ws.send({ type: 'full-reload' })
        }
        server.watcher.add(resolved.rootDirectory)
      },
    },
    esbuild: {
      setup(build) {
        build.onResolve(
          { filter: /.*/, namespace: 'remix-fs-routes' },
          ({ path: id }) => path.isAbsolute(id) ? { path: id, namespace: 'file' } : undefined,
        )
      },
    },
    webpack(compiler) {
      let virtualModulesByScheme = new Map<
        string,
        Record<string, (loaderContext: { addContextDependency(directory: string): void }) => Promise<string>>
      >()

      let addVirtualModule = (
        id: string,
        loadSource: () => Promise<string>,
      ) => {
        let separator = id.indexOf(':')
        if (separator < 1) return

        let scheme = id.slice(0, separator)
        let moduleId = id.slice(separator + 1)
        let modules = virtualModulesByScheme.get(scheme) ?? {}
        modules[moduleId] = async (loaderContext) => {
          loaderContext.addContextDependency(resolved.rootDirectory)
          return loadSource()
        }
        virtualModulesByScheme.set(scheme, modules)
      }

      addVirtualModule(routesVirtualModuleId, async () => {
        let result = await requireGenerated()
        return artifactSource(result, 'routes')
      })
      addVirtualModule(controllerVirtualModuleId, async () => {
        let result = await requireGenerated()
        return generateVirtualControllerSource(
          result,
          resolved.appDirectory,
          routesVirtualModuleId,
          options.routesExportName ?? 'routes',
          options.controllerExportName ?? 'controller',
        )
      })

      for (let [scheme, modules] of virtualModulesByScheme) {
        new compiler.webpack.experiments.schemes.VirtualUrlPlugin(modules, {
          context: resolved.appDirectory,
          scheme,
        }).apply(compiler)
      }
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)
export default unplugin

function artifactSource(
  generated: GenerateRouteArtifactsResult,
  kind: 'routes' | 'controller',
): string {
  let artifact = generated.artifacts.find((candidate) => candidate.kind === kind)
  if (!artifact) throw new Error(`Missing generated ${kind} artifact.`)
  return artifact.source
}

function generateVirtualControllerSource(
  generated: GenerateRouteArtifactsResult,
  appDirectory: string,
  routesVirtualModuleId: string,
  routesExportName: string,
  controllerExportName: string,
): string {
  let imports = generated.manifest.routes.map((entry, index) => {
    let routeModule = path.resolve(appDirectory, entry.file).split(path.sep).join('/')
    return `import { action as routeAction${index} } from ${JSON.stringify(routeModule)}`
  })
  let actions = generated.manifest.routes
    .map((entry, index) => `    ${JSON.stringify(entry.id)}: routeAction${index},`)
    .join('\n')
  return [
    generatedFileHeader,
    "import { createController } from 'remix/router'",
    `import { ${routesExportName} } from ${JSON.stringify(routesVirtualModuleId)}`,
    ...imports,
    '',
    `export const ${controllerExportName} = createController(${routesExportName}, {`,
    '  actions: {',
    actions,
    '  },',
    '})',
    '',
  ].join('\n')
}

function generateVirtualCompanionSource(
  routesVirtualModuleId: string,
  routesExportName: string,
  entry: RouteManifestEntry,
): string {
  return [
    generatedFileHeader,
    `import { ${routesExportName} } from ${JSON.stringify(routesVirtualModuleId)}`,
    '',
    `export const route = ${routesExportName}[${JSON.stringify(entry.id)}]`,
    '',
  ].join('\n')
}

function isCompanionImport(id: string): boolean {
  return id === './+route' || id === './+route.ts' || id === './+route.js'
}

function cleanModuleId(id: string): string {
  return path.resolve(id.replace(/[?#].*$/, ''))
}

function fingerprint(generated: GenerateRouteArtifactsResult): string {
  return generated.artifacts
    .map((artifact) => `${artifact.kind}\0${artifact.output}\0${artifact.source}`)
    .join('\0')
}

function isWatchedRouteFile(file: string, rootDirectory: string): boolean {
  return isInside(file, rootDirectory) && path.basename(file) !== '+route.ts'
}

function addWatchFiles(
  context: UnpluginBuildContext,
  generated: GenerateRouteArtifactsResult,
  resolved: ReturnType<typeof resolveOptions>,
): void {
  context.addWatchFile(resolved.rootDirectory)
  let native = context.getNativeBuildContext?.()
  if (native?.framework === 'webpack' || native?.framework === 'rspack') {
    native.compilation?.contextDependencies.add(resolved.rootDirectory)
  }
  for (let route of generated.manifest.routes) {
    context.addWatchFile(path.resolve(resolved.appDirectory, route.file))
  }
}

function isInside(file: string, directory: string): boolean {
  let relative = path.relative(directory, file)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}
