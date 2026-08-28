import path from 'node:path'

import ts from 'typescript'

import { fixtureAppDirectory, resolveAppImport } from './options.js'

const appPrefix = fixtureAppDirectory.endsWith(path.sep)
  ? fixtureAppDirectory
  : `${fixtureAppDirectory}${path.sep}`

function compile(code, filename) {
  return ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: 'remix/ui',
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
    },
    fileName: filename,
  }).outputText
}

export const rollupTestbedApp = {
  name: 'testbed-app',
  resolveId: resolveAppImport,
  transform(code, id) {
    let filename = id.replace(/[?#].*$/, '')
    if (!filename.startsWith(appPrefix) || !/\.[cm]?[jt]sx?$/.test(filename)) return null
    return { code: compile(code, filename), map: null }
  },
}

export const farmAppImports = {
  name: 'app-imports',
  priority: 1000,
  resolve: {
    filters: { importers: ['.*'], sources: ['^#/'] },
    executor({ source }) {
      let resolvedPath = resolveAppImport(source)
      return resolvedPath ? { resolvedPath } : null
    },
  },
}
