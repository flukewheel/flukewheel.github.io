import { resolve4, resolve6 } from 'node:dns/promises'
import { createClient } from '@supabase/supabase-js'
import { fetchLinkPreview } from '../supabase/functions/_shared/link-preview.ts'

const projectUrl = 'https://llzbpurpmcuiqcmserrd.supabase.co'
const key = process.env.FLK_SUPABASE_SERVICE_KEY
if (!key) throw new Error('Set FLK_SUPABASE_SERVICE_KEY for the backfill process.')
const limitArgument = process.argv[2] ?? '10'
const limit = limitArgument === '--all' ? Infinity : Number(limitArgument)
if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) throw new Error('Use a positive limit or --all.')

const admin = createClient(projectUrl, key, { auth: { persistSession: false, autoRefreshToken: false } })
const websites = []
for (let offset = 0; ; offset += 500) {
  const { data, error } = await admin.from('websites')
    .select('id, original_url, title')
    .eq('approval_status', 'approved').eq('active', true).is('thumbnail_path', null)
    .order('approved_at', { ascending: false }).order('id', { ascending: false })
    .range(offset, offset + 499)
  if (error) throw error
  websites.push(...(data ?? []))
  if ((data?.length ?? 0) < 500) break
}

const targets = websites.slice(0, limit)
const results = { saved: 0, unavailable: 0, failed: 0 }
let next = 0

async function resolveDns(hostname, type) {
  return type === 'A' ? resolve4(hostname) : resolve6(hostname)
}

async function worker() {
  while (next < targets.length) {
    const website = targets[next++]
    try {
      const preview = await fetchLinkPreview(website.original_url, resolveDns)
      if (!preview) { results.unavailable++; continue }
      const path = `link-previews/${website.id}.${preview.extension}`
      const { error: uploadError } = await admin.storage.from('thumbnails').upload(path, preview.bytes, {
        contentType: preview.mime, upsert: true, cacheControl: '86400',
      })
      if (uploadError) throw uploadError
      const { data, error: updateError } = await admin.from('websites')
        .update({ thumbnail_path: path }).eq('id', website.id).is('thumbnail_path', null).select('id')
      if (updateError) throw updateError
      if (data?.length) results.saved++
    } catch (cause) {
      results.failed++
      console.error(`Preview failed for ${website.title}: ${cause instanceof Error ? cause.message : String(cause)}`)
    }
    const complete = results.saved + results.unavailable + results.failed
    if (complete % 10 === 0 || complete === targets.length) {
      console.log(JSON.stringify({ complete, total: targets.length, ...results }))
    }
  }
}

console.log(`Checking ${targets.length} published sites without stored thumbnails.`)
await Promise.all(Array.from({ length: Math.min(3, targets.length) }, () => worker()))
