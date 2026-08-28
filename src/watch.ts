import path from 'node:path'

import chokidar, { type FSWatcher } from 'chokidar'

import { resolveOptions } from './convention.js'
import { writeRouteArtifacts } from './write.js'
import type { WriteRouteArtifactsOptions, WriteRouteArtifactsResult } from './types.js'

export interface WatchRouteArtifactsHandlers {
  onResult?(result: WriteRouteArtifactsResult): void
  onError?(error: unknown): void
}

export interface WatchRouteArtifactsOptions extends WriteRouteArtifactsOptions {
  /** Delay used to coalesce bursts of filesystem events. Defaults to 30ms. */
  debounceMs?: number
  /** Use polling at this interval instead of native filesystem events. */
  pollingIntervalMs?: number
}

export interface RouteArtifactsWatcher {
  close(): Promise<void>
}

export async function watchRouteArtifacts(
  options: WatchRouteArtifactsOptions = {},
  handlers: WatchRouteArtifactsHandlers = {},
): Promise<RouteArtifactsWatcher> {
  if (options.check) throw new TypeError('Watch mode cannot be combined with check mode.')

  let resolved = resolveOptions(options)
  let watcher = chokidar.watch(resolved.rootDirectory, {
    ignoreInitial: true,
    usePolling: options.pollingIntervalMs !== undefined,
    interval: options.pollingIntervalMs,
    ignored: (watchedPath) =>
      path.basename(watchedPath).startsWith('.') || path.basename(watchedPath) === '+route.ts',
  })
  let timer: NodeJS.Timeout | undefined
  let closed = false
  let running = Promise.resolve()

  let generate = () => {
    running = running.then(async () => {
      if (closed) return
      try {
        handlers.onResult?.(await writeRouteArtifacts(options))
      } catch (error) {
        handlers.onError?.(error)
      }
    })
    return running
  }

  let schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(generate, options.debounceMs ?? 30)
  }

  watcher.on('add', schedule).on('change', schedule).on('unlink', schedule)
  watcher.on('addDir', schedule).on('unlinkDir', schedule)
  try {
    await waitUntilReady(watcher)
  } catch (error) {
    await watcher.close()
    throw error
  }
  watcher.on('error', (error) => handlers.onError?.(error))
  await generate()

  return {
    async close() {
      if (closed) return
      closed = true
      clearTimeout(timer)
      await running
      await watcher.close()
    },
  }
}

function waitUntilReady(watcher: FSWatcher): Promise<void> {
  return new Promise((resolve, reject) => {
    watcher.once('ready', resolve)
    watcher.once('error', reject)
  })
}
