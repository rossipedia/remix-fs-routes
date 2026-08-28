import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

const appDirectory = new URL('./app/', import.meta.url)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith('#/') || !specifier.endsWith('.js')) {
      return nextResolve(specifier, context)
    }

    let target = new URL(specifier.slice(2), appDirectory)
    if (existsSync(fileURLToPath(target))) return { shortCircuit: true, url: target.href }

    let source = target.href.slice(0, -'.js'.length)
    for (let extension of ['.ts', '.tsx', '.jsx']) {
      let candidate = new URL(`${source}${extension}`)
      if (existsSync(fileURLToPath(candidate))) {
        return { shortCircuit: true, url: candidate.href }
      }
    }

    return nextResolve(specifier, context)
  },
})
