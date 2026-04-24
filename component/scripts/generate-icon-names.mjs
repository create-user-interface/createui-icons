// Генерирует src/icon-names.types.ts с объединением TIconName всех иконок
// в установленной версии lucide. Источник — имена файлов в lucide's
// `dist/esm/icons/*.mjs`, потому что это ровно тот же набор, что лежит
// на сервере в `/var/icons/versions/{ver}/*.svg`.
//
// ВАЖНО: не использовать `Object.keys(icons)` из 'lucide' — там же, кроме
// канонических имён, экспортированы backward-compat алиасы (`clipboard-edit`
// → канонический `clipboard-pen` после переименования). Сервер про алиасы
// ничего не знает, для них получаем 404. lucide@1.11.0: 1699 файлов vs
// 1943 экспорта из-за 244 алиасов.
import { readdirSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const outPath = join(here, '..', 'src', 'icon-names.types.ts')

const require = createRequire(import.meta.url)
const lucidePkg = require.resolve('lucide/package.json')
const iconsDir = join(dirname(lucidePkg), 'dist/esm/icons')

const names = readdirSync(iconsDir)
  .filter((f) => f.endsWith('.mjs'))
  .map((f) => f.slice(0, -'.mjs'.length))
  .sort()

const content = `// Generated from lucide — do not edit.
// Run \`npm run generate:names\` to refresh.
export type TIconName =
${names.map((n) => `  | '${n}'`).join('\n')}
`

writeFileSync(outPath, content, 'utf-8')
console.log(`[generate-icon-names] ${names.length} names → ${outPath}`)
