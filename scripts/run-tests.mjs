import { spawnSync } from 'node:child_process'

const testArgs = process.argv.slice(2)
if (testArgs[0] === '--') {
  testArgs.shift()
}

run('pnpm', ['exec', 'vitest', 'run', ...testArgs])

if (testArgs.length === 0) {
  run('pnpm', ['--filter', './packages/*', 'test'])
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
