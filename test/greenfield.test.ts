import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

interface GreenfieldIntegration {
  name: string
  build: string
  devDependencies?: string[]
  files?: Record<string, string>
  cli?: boolean
  requiresBun?: boolean
}

const repositoryDirectory = fileURLToPath(new URL('../', import.meta.url))
const storeDirectory = path.join(repositoryDirectory, '.pnpm-store')
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const packageMetadata = JSON.parse(
  await readFile(path.join(repositoryDirectory, 'package.json'), 'utf8'),
) as {
  name: string
  version: string
  dependencies?: Record<string, string>
  devDependencies: Record<string, string>
  packageManager: string
}
const testAppPackageMetadata = JSON.parse(
  await readFile(path.join(repositoryDirectory, 'test-app/package.json'), 'utf8'),
) as {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}
const dependencyVersions = {
  ...packageMetadata.dependencies,
  ...packageMetadata.devDependencies,
  ...testAppPackageMetadata.dependencies,
  ...testAppPackageMetadata.devDependencies,
}
const installedDependencyVersions = new Map<string, string>()

const appEntry = `import assert from 'node:assert/strict'

import { createRouter } from 'remix/router'
import { registerRoutes } from 'virtual:remix-fs-routes/controller'
import { href } from 'virtual:remix-fs-routes/routes'

let router = createRouter()
registerRoutes(router)

let response = await router.fetch(new Request(\`http://test\${href('/')}\`))
assert.equal(response.status, 200)
assert.equal(await response.text(), 'greenfield route')

console.log('greenfield app passed')
`

const cliEntry = appEntry
  .replace("from 'virtual:remix-fs-routes/controller'", "from './routes.controller.ts'")
  .replace("from 'virtual:remix-fs-routes/routes'", "from './routes.ts'")

const routeAction = `import { createAction } from './+route.ts'

export default createAction(() => new Response('greenfield route'))
`

const tsconfig = `${JSON.stringify(
  {
    compilerOptions: {
      strict: true,
      types: ['node'],
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      target: 'ESNext',
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      isolatedModules: true,
      noEmit: true,
      skipLibCheck: true,
    },
    include: ['app', '.remix-fs-routes/types/**/*'],
  },
  null,
  2,
)}\n`

const integrations: GreenfieldIntegration[] = [
  {
    name: 'cli',
    cli: true,
    build: 'remix-fs-routes generate && tsc --noEmit',
  },
  {
    name: 'vite',
    build: 'vite build',
    devDependencies: ['vite'],
    files: {
      'vite.config.ts': `import { defineConfig } from 'vite'
import remixFsRoutes from 'remix-fs-routes/vite'

export default defineConfig({
  plugins: [remixFsRoutes()],
  build: {
    outDir: 'dist',
    ssr: 'app/entry.ts',
    rollupOptions: {
      external: [/^node:/, /^remix\\//],
      output: { entryFileNames: 'bundle.mjs' },
    },
  },
})
`,
    },
  },
  {
    name: 'rolldown',
    build: 'rolldown --config rolldown.config.ts',
    devDependencies: ['rolldown'],
    files: {
      'rolldown.config.ts': `import { defineConfig } from 'rolldown'
import remixFsRoutes from 'remix-fs-routes/rolldown'

export default defineConfig({
  input: 'app/entry.ts',
  external: [/^node:/, /^remix\\//],
  plugins: [remixFsRoutes()],
  output: { file: 'dist/bundle.mjs', format: 'esm' },
})
`,
    },
  },
  {
    name: 'webpack',
    build: 'webpack --config webpack.config.js',
    devDependencies: ['webpack', 'webpack-cli', 'ts-loader'],
    files: {
      'webpack.config.js': `import path from 'node:path'

import remixFsRoutes from 'remix-fs-routes/webpack'

export default {
  mode: 'production',
  target: 'node20',
  entry: './app/entry.ts',
  devtool: false,
  experiments: { outputModule: true },
  externalsType: 'module',
  externals: [
    ({ request }, callback) =>
      request?.startsWith('remix/') ? callback(null, request) : callback(),
  ],
  optimization: { minimize: false },
  module: {
    rules: [
      {
        test: /\\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
          onlyCompileBundledFiles: true,
          compilerOptions: { noEmit: false, rewriteRelativeImportExtensions: true },
        },
      },
    ],
  },
  resolve: {
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
  },
  plugins: [remixFsRoutes()],
  output: {
    path: path.resolve('dist'),
    filename: 'bundle.mjs',
    module: true,
    clean: true,
  },
}
`,
    },
  },
  {
    name: 'rspack',
    build: 'rspack build --config rspack.config.ts',
    devDependencies: ['@rspack/core', '@rspack/cli'],
    files: {
      'rspack.config.ts': `import path from 'node:path'

import { defineConfig } from '@rspack/cli'
import remixFsRoutes from 'remix-fs-routes/rspack'

export default defineConfig({
  mode: 'production',
  target: 'node',
  entry: './app/entry.ts',
  devtool: false,
  externalsType: 'module',
  externals: [
    ({ request }, callback) =>
      request?.startsWith('remix/') ? callback(undefined, request) : callback(),
  ],
  optimization: { minimize: false },
  module: {
    rules: [{ test: /\\.[jt]sx?$/, loader: 'builtin:swc-loader' }],
  },
  resolve: {
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'] },
  },
  plugins: [remixFsRoutes()],
  output: {
    path: path.resolve('dist'),
    filename: 'bundle.mjs',
    module: true,
    clean: true,
  },
})
`,
    },
  },
  {
    name: 'rsbuild',
    build: 'rsbuild build --config rsbuild.config.ts',
    devDependencies: ['@rsbuild/core'],
    files: {
      'rsbuild.config.ts': `import { defineConfig } from '@rsbuild/core'
import remixFsRoutes from 'remix-fs-routes/rsbuild'

export default defineConfig({
  plugins: [remixFsRoutes()],
  source: { entry: { bundle: './app/entry.ts' } },
  output: {
    target: 'node',
    distPath: { root: 'dist', js: '' },
    filename: { js: '[name].mjs' },
    filenameHash: false,
  },
  tools: {
    htmlPlugin: false,
    rspack(config) {
      config.externalsType = 'module'
      config.externals = [
        ({ request }, callback) =>
          request?.startsWith('remix/') ? callback(undefined, request) : callback(),
      ]
      config.output = { ...config.output, module: true }
    },
  },
})
`,
    },
  },
  {
    name: 'esbuild',
    build: 'node build.mjs',
    devDependencies: ['esbuild'],
    files: {
      'build.mjs': `import { build } from 'esbuild'
import remixFsRoutes from 'remix-fs-routes/esbuild'

await build({
  entryPoints: ['app/entry.ts'],
  outfile: 'dist/bundle.mjs',
  bundle: true,
  external: ['remix/*'],
  format: 'esm',
  platform: 'node',
  plugins: [remixFsRoutes()],
})
`,
    },
  },
  {
    name: 'farm',
    build: 'node build.mjs',
    devDependencies: ['@farmfe/core'],
    files: {
      'build.mjs': `import path from 'node:path'

import { build } from '@farmfe/core'

await build({ configPath: path.resolve('farm.config.ts'), mode: 'production' })
`,
      'farm.config.ts': `import { defineConfig } from '@farmfe/core'
import remixFsRoutes from 'remix-fs-routes/farm'

export default defineConfig({
  compilation: {
    input: { bundle: './app/entry.ts' },
    external: ['^remix/'],
    persistentCache: false,
    output: {
      path: 'dist',
      entryFilename: 'bundle.mjs',
      format: 'esm',
      targetEnv: 'node',
    },
  },
  plugins: [remixFsRoutes()],
})
`,
    },
  },
  {
    name: 'bun',
    build: 'bun run build.mjs',
    requiresBun: true,
    files: {
      'build.mjs': `import remixFsRoutes from 'remix-fs-routes/bun'

let result = await Bun.build({
  entrypoints: ['app/entry.ts'],
  outdir: 'dist',
  naming: 'bundle.mjs',
  external: ['remix/*'],
  format: 'esm',
  target: 'node',
  plugins: [remixFsRoutes()],
})

if (!result.success) {
  for (let log of result.logs) console.error(log)
  process.exitCode = 1
}
`,
    },
  },
]

let suiteDirectory: string
let tarballPath: string

beforeAll(async () => {
  suiteDirectory = await mkdtemp(path.join(tmpdir(), 'remix-fs-routes-greenfield-'))
  let packDirectory = path.join(suiteDirectory, 'package')
  await mkdir(packDirectory)
  await run(repositoryDirectory, pnpm, ['pack', '--pack-destination', packDirectory])

  tarballPath = path.join(packDirectory, `${packageMetadata.name}-${packageMetadata.version}.tgz`)
  expect(existsSync(tarballPath)).toBe(true)
}, 120_000)

afterAll(async () => {
  if (suiteDirectory) await rm(suiteDirectory, { recursive: true, force: true })
})

describe.sequential('greenfield package installation', () => {
  for (let integration of integrations) {
    let test = integration.requiresBun && !hasBun() ? it.skip : it
    test(`builds a fresh ${integration.name} project from the packed tarball`, async () => {
      let projectDirectory = path.join(suiteDirectory, integration.name)
      await createProject(projectDirectory, integration)

      await run(projectDirectory, pnpm, [
        'add',
        '--save-dev',
        tarballPath,
        '--store-dir',
        storeDirectory,
        '--prefer-offline',
      ])

      let lockfile = await readFile(path.join(projectDirectory, 'pnpm-lock.yaml'), 'utf8')
      expect(lockfile).toContain(path.basename(tarballPath))

      let projectPackage = JSON.parse(
        await readFile(path.join(projectDirectory, 'package.json'), 'utf8'),
      )
      expect(projectPackage.devDependencies['remix-fs-routes']).toContain(
        path.basename(tarballPath),
      )

      let installedPackage = JSON.parse(
        await readFile(
          path.join(projectDirectory, 'node_modules/remix-fs-routes/package.json'),
          'utf8',
        ),
      )
      expect(installedPackage.version).toBe(packageMetadata.version)

      await run(projectDirectory, pnpm, ['run', 'build'])
      let output = await run(projectDirectory, pnpm, ['run', 'test:build'])
      expect(output).toContain('greenfield app passed')
    }, 120_000)
  }
})

async function createProject(
  projectDirectory: string,
  integration: GreenfieldIntegration,
): Promise<void> {
  await mkdir(path.join(projectDirectory, 'app/routes/_index'), { recursive: true })

  let devDependencies: Record<string, string> = {
    '@types/node': await dependencyVersion('@types/node'),
    typescript: await dependencyVersion('typescript'),
  }
  for (let dependency of integration.devDependencies ?? []) {
    devDependencies[dependency] = await dependencyVersion(dependency)
  }

  let manifest = {
    name: `greenfield-${integration.name}`,
    private: true,
    type: 'module',
    packageManager: packageMetadata.packageManager,
    scripts: {
      build: integration.build,
      'test:build': integration.cli
        ? 'node --import remix/node-tsx app/entry.ts'
        : 'node dist/bundle.mjs',
    },
    dependencies: {
      remix: await dependencyVersion('remix'),
    },
    devDependencies,
  }

  await writeFile(
    path.join(projectDirectory, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  await writeFile(
    path.join(projectDirectory, 'pnpm-workspace.yaml'),
    'allowBuilds:\n  core-js: true\n  esbuild: true\n',
  )
  await writeFile(path.join(projectDirectory, 'tsconfig.json'), tsconfig)
  await writeFile(
    path.join(projectDirectory, 'app/entry.ts'),
    integration.cli ? cliEntry : appEntry,
  )
  await writeFile(path.join(projectDirectory, 'app/routes/_index/actions.ts'), routeAction)

  for (let [file, source] of Object.entries(integration.files ?? {})) {
    let output = path.join(projectDirectory, file)
    await mkdir(path.dirname(output), { recursive: true })
    await writeFile(output, source)
  }
}

function run(cwd: string, command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let child = spawn(command, args, {
      cwd,
      env: { ...process.env, CI: '1', COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(`${stdout}${stderr}`)
      } else {
        reject(
          new Error(
            `${command} ${args.join(' ')} failed in ${cwd} with exit code ${code}.\n${stdout}${stderr}`,
          ),
        )
      }
    })
  })
}

function hasBun(): boolean {
  return spawnSync('bun', ['--version'], { stdio: 'ignore' }).status === 0
}

async function dependencyVersion(name: string): Promise<string> {
  let cached = installedDependencyVersions.get(name)
  if (cached) return cached
  if (!dependencyVersions[name]) throw new Error(`Missing dependency declaration for ${name}.`)

  for (let directory of [repositoryDirectory, path.join(repositoryDirectory, 'test-app')]) {
    let manifest = path.join(directory, 'node_modules', name, 'package.json')
    if (!existsSync(manifest)) continue
    let metadata = JSON.parse(await readFile(manifest, 'utf8')) as { version: string }
    installedDependencyVersions.set(name, metadata.version)
    return metadata.version
  }

  throw new Error(`Missing installed dependency ${name}; run pnpm install first.`)
}
