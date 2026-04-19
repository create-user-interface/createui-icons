import { icons } from 'lucide'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const outPath = join(here, '..', 'src', 'icon-names.types.ts')

function pascalToKebab(s) {
  return s
    .split('')
    .map((c, i) => {
      if (i === 0) return c.toLowerCase()
      const isUpper = c === c.toUpperCase() && c.toLowerCase() !== c
      return isUpper ? `-${c.toLowerCase()}` : c
    })
    .join('')
}

const names = Object.keys(icons).map(pascalToKebab).sort()

const content = `// Generated from lucide — do not edit.
// Run \`npm run generate:names\` to refresh.
export type TIconName =
${names.map((n) => `  | '${n}'`).join('\n')}
`

writeFileSync(outPath, content, 'utf-8')
console.log(`[generate-icon-names] ${names.length} names → ${outPath}`)
