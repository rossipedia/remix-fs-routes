import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const fixtureDirectory = fileURLToPath(new URL('./', import.meta.url))
export const fixtureAppDirectory = fileURLToPath(new URL('./app/', import.meta.url))
export const fixtureEntry = fileURLToPath(new URL('./app/entry.ts', import.meta.url))
export const fixtureTsxLoader = fileURLToPath(new URL('./tsx-loader.cjs', import.meta.url))

export function resolveAppImport(specifier) {
  if (!specifier.startsWith('#/')) return undefined
  let target = fileURLToPath(new URL(specifier.slice(2), new URL('./app/', import.meta.url)))
  if (existsSync(target)) return target
  if (!target.endsWith('.js')) return undefined

  let source = target.slice(0, -'.js'.length)
  for (let extension of ['.ts', '.tsx', '.jsx']) {
    if (existsSync(`${source}${extension}`)) return `${source}${extension}`
  }

  return undefined
}

export const buildAppImports = {
  name: 'app-imports',
  setup(build) {
    build.onResolve({ filter: /^#\// }, ({ path }) => ({ path: resolveAppImport(path) }))
  },
}

export const pluginOptions = {
  cwd: fixtureDirectory,
}
