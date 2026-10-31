const trackingParameters = new Set([
  'fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'mc_cid', 'mc_eid',
])
const blockedSuffixes = ['.localhost', '.local', '.internal', '.test', '.invalid', '.example', '.onion', '.lan']

export function normaliseSubmissionUrl(raw: string): string {
  if (raw.length < 8 || raw.length > 2048 || raw !== raw.trim() || /[\\\u0000-\u001f\u007f]/.test(raw)) {
    throw new Error('Enter a valid website URL of at most 2,048 characters.')
  }

  let url: URL
  try { url = new URL(raw) }
  catch { throw new Error('Enter a complete website URL beginning with http:// or https://.') }
  if (!['http:', 'https:'].includes(url.protocol) || !/^https?:\/\//i.test(raw)) {
    throw new Error('Only HTTP and HTTPS website URLs are supported.')
  }
  if (url.username || url.password) throw new Error('Remove the username or password from the URL.')
  if (url.port) throw new Error('URLs with a custom port are not supported.')

  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!host.includes('.') || host === 'localhost' || host.startsWith('[') || /^\d+(?:\.\d+){3}$/.test(host)
    || blockedSuffixes.some((suffix) => host.endsWith(suffix))
    || host.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new Error('Use a public website domain, not a local or IP address.')
  }

  url.hostname = host
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || trackingParameters.has(key.toLowerCase())) url.searchParams.delete(key)
  }
  return url.toString()
}
