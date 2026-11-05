import { readFile, writeFile } from 'node:fs/promises'

const date = process.argv[2] ?? '2026-10-30'
const firstId = Number(process.argv[3] ?? 117)
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(firstId) || firstId < 1) throw new Error('Provide a date and positive first ID')
const root = `supabase/catalogue/${date}`
const urls = (await readFile(`${root}-requested.txt`, 'utf8')).trim().split(/\r?\n/)
const metadata = (await readFile(`${root}-metadata.txt`, 'utf8')).trim().split(/\r?\n/)
if (urls.length === 0 || urls.length !== metadata.length) throw new Error('Catalogue input counts do not match')

const quote = (value) => `'${value.replaceAll("'", "''")}'`
const categories = new Set(['educational', 'funny', 'art', 'free'])
const statuses = new Set(['allowed', 'blocked', 'unknown'])
const records = urls.map((url, index) => {
  const [title, description, categoryList, status] = metadata[index].split('|')
  const parsed = new URL(url)
  const normalized = new URL(url)
  normalized.hash = ''
  const slugs = categoryList.split(',')
  if (!['http:', 'https:'].includes(parsed.protocol) || !title || !description || !statuses.has(status)) throw new Error(`Invalid record ${index + 1}`)
  if (title.length > 160 || description.length > 1000 || slugs.some((slug) => !categories.has(slug))) throw new Error(`Invalid metadata ${index + 1}`)
  return { id: `20000000-0000-4000-8000-${String(index + firstId).padStart(12, '0')}`, url, normalized: normalized.href, title, description, slugs, status }
})
if (new Set(records.map((record) => record.normalized)).size !== records.length) throw new Error('Duplicate normalized URL')

const values = records.map((record) => `  (${quote(record.id)}::uuid, ${quote(record.url)}, ${quote(record.normalized)}, ${quote(record.title)}, ${quote(record.description)}, 'approved', true, ${quote(record.status)}, now(), ${record.status === 'unknown' ? 'null' : 'now()'})`).join(',\n')
const assignments = records.flatMap((record) => record.slugs.map((slug) => `  (${quote(record.id)}::uuid, ${quote(slug)})`)).join(',\n')
const marker = `-- User-curated catalogue additions, ${date}.`
const sql = `${marker} Embedding status records compatibility evidence; active entries still load in the viewer.\ninsert into public.websites (\n  id, original_url, normalised_url, title, description,\n  approval_status, active, embedding_status, approved_at, last_validated_at\n) values\n${values}\non conflict (id) do update set\n  original_url = excluded.original_url,\n  normalised_url = excluded.normalised_url,\n  title = excluded.title,\n  description = excluded.description,\n  approval_status = excluded.approval_status,\n  active = excluded.active,\n  embedding_status = excluded.embedding_status,\n  approved_at = excluded.approved_at,\n  last_validated_at = excluded.last_validated_at;\n\ninsert into public.website_categories (website_id, category_id)\nselect assignment.website_id, category.id\nfrom (values\n${assignments}\n) as assignment(website_id, slug)\njoin public.categories category on category.slug = assignment.slug\non conflict do nothing;\n`
await writeFile(`${root}-additions.sql`, sql)
const seedPath = 'supabase/seed.sql'
const seed = await readFile(seedPath, 'utf8')
const start = seed.indexOf(marker)
const next = start === -1 ? -1 : seed.indexOf('\n-- User-curated catalogue additions, ', start + marker.length)
const prefix = (start === -1 ? seed : seed.slice(0, start)).trimEnd()
const suffix = next === -1 ? '' : seed.slice(next).trim()
await writeFile(seedPath, `${[prefix, sql.trimEnd(), suffix].filter(Boolean).join('\n\n')}\n`)
console.log(JSON.stringify({ records: records.length, blockedEmbeds: records.filter((record) => record.status === 'blocked').length, firstId: records[0].id, lastId: records.at(-1).id }))
