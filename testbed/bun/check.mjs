import { spawnSync } from 'node:child_process'

let version = spawnSync('bun', ['--version'], { stdio: 'ignore' })
if (version.error?.code === 'ENOENT') {
  console.log('skipped Bun testbed: bun is not installed')
  process.exit(0)
}
if (version.status !== 0) process.exit(version.status ?? 1)

let build = spawnSync('bun', ['run', 'build.mjs'], { stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)

let test = spawnSync(process.execPath, ['dist/bundle.mjs'], { stdio: 'inherit' })
process.exit(test.status ?? 1)
