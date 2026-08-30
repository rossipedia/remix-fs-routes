import path from 'node:path'

import { createUnplugin, type UnpluginBuildContext, type UnpluginFactory } from 'unplugin'

import { resolveOptions } from './convention.js'
import { generatedFileHeader } from './generate.js'
import { ignoreGeneratedOutputs, writeRouteArtifacts } from './write.js'
import type { GenerateRouteArtifactsResult, RemixFsRoutesPluginOptions } from './types.js'

export const defaultRoutesVirtualModuleId = 'virtual:remix-fs-routes/routes'
export const defaultControllerVirtualModuleId = 'virtual:remix-fs-routes/controller'

export const unpluginFactory: UnpluginFactory<RemixFsRoutesPluginOptions | undefined> = (
  userOptions = {},
  meta,
) => {
  if ('write' in userOptions) {
    throw new TypeError(
      'The write option is no longer supported; route companions are always written.',
    )
  }
  let options = { ...userOptions }
  let resolvedRoutesVirtualModuleId = `\0${defaultRoutesVirtualModuleId}`
  let resolvedControllerVirtualModuleId = `\0${defaultControllerVirtualModuleId}`
  let resolved = resolveOptions(options)
  let generated: GenerateRouteArtifactsResult | undefined
  let generatedFingerprint: string | undefined
  let refreshPromise:
    | Promise<{ generated: GenerateRouteArtifactsResult; changed: boolean }>
    | undefined
  let refreshPending = false
  let invalidateVite: ((moduleIds: string[]) => void) | undefined

  let refresh = async () => {
    generated = await writeRouteArtifacts(ignoreGeneratedOutputs(options))
    let nextFingerprint = fingerprint(generated)
    let changed = generatedFingerprint !== nextFingerprint
    generatedFingerprint = nextFingerprint
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
    async resolveId(id) {
      if (id === defaultRoutesVirtualModuleId) return resolvedRoutesVirtualModuleId
      if (id === defaultControllerVirtualModuleId) return resolvedControllerVirtualModuleId
      return undefined
    },
    loadInclude(id) {
      return id === resolvedRoutesVirtualModuleId || id === resolvedControllerVirtualModuleId
    },
    async load(id) {
      let result: GenerateRouteArtifactsResult | undefined
      if (id === resolvedRoutesVirtualModuleId) {
        result = await requireGenerated()
        addWatchFiles(this, result, resolved)
        return generateVirtualRoutesSource(result, options.routesExportName ?? 'routes')
      }
      if (id === resolvedControllerVirtualModuleId) {
        result = await requireGenerated()
        addWatchFiles(this, result, resolved)
        return generateVirtualControllerSource(
          result,
          options.controllerExportName ?? 'registerRoutes',
        )
      }
      return undefined
    },
    async watchChange(id) {
      let file = cleanModuleId(id)
      if (!isWatchedRouteFile(file, resolved.rootDirectory)) return

      let result = await queueRefresh()
      addWatchFiles(this, result.generated, resolved)
      if (result.changed) {
        invalidateVite?.([resolvedRoutesVirtualModuleId, resolvedControllerVirtualModuleId])
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
    rollup: {
      async options(inputOptions) {
        await queueRefresh()
        return inputOptions
      },
    },
    esbuild: {
      setup(build) {
        build.onResolve({ filter: /.*/, namespace: 'remix-fs-routes' }, ({ path: id }) =>
          path.isAbsolute(id) ? { path: id, namespace: 'file' } : undefined,
        )
      },
    },
    webpack(compiler) {
      let virtualModulesByScheme = new Map<
        string,
        Record<
          string,
          (loaderContext: { addContextDependency(directory: string): void }) => Promise<string>
        >
      >()

      let addVirtualModule = (id: string, loadSource: () => Promise<string>) => {
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

      addVirtualModule(defaultRoutesVirtualModuleId, async () => {
        let result = await requireGenerated()
        return generateVirtualRoutesSource(result, options.routesExportName ?? 'routes')
      })
      addVirtualModule(defaultControllerVirtualModuleId, async () => {
        let result = await requireGenerated()
        return generateVirtualControllerSource(
          result,
          options.controllerExportName ?? 'registerRoutes',
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

function generateVirtualRoutesSource(
  generated: GenerateRouteArtifactsResult,
  routesExportName: string,
): string {
  let routesArtifact = generated.artifacts.find((artifact) => artifact.kind === 'routes')
  if (!routesArtifact) throw new Error('Generated routes artifact is missing.')
  let routesModule = routesArtifact.output.split(path.sep).join('/')
  return [
    generatedFileHeader,
    `export { href, ${routesExportName} } from ${JSON.stringify(routesModule)}`,
    '',
  ].join('\n')
}

function generateVirtualControllerSource(
  generated: GenerateRouteArtifactsResult,
  controllerExportName: string,
): string {
  let controllerArtifact = generated.artifacts.find((artifact) => artifact.kind === 'controller')
  if (!controllerArtifact) throw new Error('Generated controller artifact is missing.')
  let controllerModule = controllerArtifact.output.split(path.sep).join('/')
  return [
    generatedFileHeader,
    `export { ${controllerExportName} } from ${JSON.stringify(controllerModule)}`,
    '',
  ].join('\n')
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
  return (
    isInside(file, rootDirectory) && !['+route.ts', '+controller.ts'].includes(path.basename(file))
  )
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
