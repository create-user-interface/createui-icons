#!/usr/bin/env node
// Синхронно обновляет версию Lucide в трёх местах и пересобирает лок-файл + типы.
// Usage: node scripts/bump-lucide.mjs <version>
//   e.g. node scripts/bump-lucide.mjs 1.9.0

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const componentDir = join(here, '..', 'component')

const version = process.argv[2]
if (!version) {
  console.error('Usage: node scripts/bump-lucide.mjs <version>')
  process.exit(1)
}
if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) {
  console.error(`Invalid semver: ${version}`)
  process.exit(1)
}

const pkgPath = join(componentDir, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
pkg.version = version
pkg.devDependencies.lucide = version
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')

const versionTsPath = join(componentDir, 'src', 'version.ts')
writeFileSync(
  versionTsPath,
  `// Обновляется CI перед \`npm publish\` вместе с package.json.version и devDependencies.lucide.\nexport const LUCIDE_VERSION = '${version}'\n`,
  'utf-8',
)

const run = (cmd) => execSync(cmd, { cwd: componentDir, stdio: 'inherit' })
run('npm install')
run('npm run generate:names')
run('npm run typecheck')

console.log(`\n✓ Bumped to lucide@${version}`)
