import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const fixtureDirectory = fileURLToPath(new URL('../', import.meta.url))
export const fixtureAppDirectory = fileURLToPath(new URL('../app/', import.meta.url))
export const fixtureEntry = fileURLToPath(new URL('../app/entry.ts', import.meta.url))

export function resolveAppImport(specifier: string) {
  if (!specifier.startsWith('#/')) return undefined
  let target = fileURLToPath(new URL(specifier.slice(2), new URL('../app/', import.meta.url)))
  return existsSync(target) ? target : undefined
}

export const pluginOptions = {
  cwd: fixtureDirectory,
}
