import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(process.argv[2] ?? 'apps/web/dist')
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.svg'])
const secretPatterns = [
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{8,}\b/g],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g],
  ['API key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g],
]
const findings = []
let filesChecked = 0

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) { await scan(fullPath); continue }
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name))) continue
    filesChecked++
    const source = await readFile(fullPath, 'utf8')
    const relative = path.relative(root, fullPath)
    for (const [name, pattern] of secretPatterns) {
      pattern.lastIndex = 0
      if (pattern.test(source)) findings.push(`${relative}: ${name}`)
    }
    for (const match of source.matchAll(/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)) {
      try {
        const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'))
        if (payload.role === 'service_role') findings.push(`${relative}: service-role JWT`)
      } catch { /* Ignore text that only resembles a JWT. */ }
    }
  }
}

await scan(root)
if (filesChecked === 0) throw new Error(`No text assets found in ${root}. Build the web app first.`)
if (findings.length > 0) {
  console.error(`Public bundle contains credential material:\n${findings.join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Public bundle credential check passed (${filesChecked} text assets).`)
}
