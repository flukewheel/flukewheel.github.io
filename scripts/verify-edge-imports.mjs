import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const functionsRoot = fileURLToPath(new URL('../supabase/functions/', import.meta.url))
const entries = await readdir(functionsRoot, { withFileTypes: true })
const functionNames = entries
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name)

if (functionNames.length === 0) {
  throw new Error('No Supabase Edge Functions were found')
}

for (const functionName of functionNames) {
  const functionRoot = join(functionsRoot, functionName)
  const denoConfig = JSON.parse(await readFile(join(functionRoot, 'deno.json'), 'utf8'))
  const source = await readFile(join(functionRoot, 'index.ts'), 'utf8')
  const imports = denoConfig.imports ?? {}

  for (const [alias, target] of Object.entries(imports)) {
    if (typeof target !== 'string' || !/^npm:.+@\d/.test(target)) {
      throw new Error(`${functionName}: ${alias} must use an exact versioned npm: import`)
    }
    if (!source.includes(`from '${alias}'`) && !source.includes(`from "${alias}"`)) {
      throw new Error(`${functionName}: configured import ${alias} is unused`)
    }
  }

  for (const match of source.matchAll(/from\s+['"]([^./][^'"]*)['"]/g)) {
    const specifier = match[1]
    if (!(specifier in imports)) {
      throw new Error(`${functionName}: bare import ${specifier} is missing from deno.json`)
    }
  }
}

console.log(`Verified versioned Deno imports for ${functionNames.length} Edge Function(s).`)
