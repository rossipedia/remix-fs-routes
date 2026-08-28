import { fileURLToPath } from 'node:url'

export const fixtureDirectory = fileURLToPath(new URL('./', import.meta.url))
export const fixtureEntry = fileURLToPath(new URL('./app/entry.js', import.meta.url))

export const pluginOptions = {
  cwd: fixtureDirectory,
  routesOutput: 'app/routes.js',
  controllerOutput: 'app/routes.controller.js',
}
