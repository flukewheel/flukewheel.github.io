import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { IconButton } from '../../components/IconButton'
import { catalogueAdapter } from '../../lib/adapters'
import { getSupabaseClient } from '../../lib/supabase'

interface SubmissionModalProps {
  open: boolean
  onClose: () => void
  onSubmitted?: () => void
}

export function SubmissionModal({ open, onClose, onSubmitted }: SubmissionModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const requestIdRef = useRef<string | null>(null)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogueAdapter.listCategories, enabled: open })

  useEffect(() => {
    if (!open) return
    lastFocusRef.current = document.activeElement as HTMLElement | null
    queueMicrotask(() => closeButtonRef.current?.focus())
    return () => lastFocusRef.current?.focus()
  }, [open])

  if (!open) return null

  function close() {
    if (busy) return
    setUrl(''); setDescription(''); setSelected([]); setReceipt(false); setError(null)
    requestIdRef.current = null
    onClose()
  }

  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') { close(); return }
    if (event.key !== 'Tab') return
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') ?? [])]
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const client = getSupabaseClient()
    if (!client) { setError('Suggestions are unavailable. Please try again later.'); return }
    setBusy(true); setError(null)
    requestIdRef.current ??= crypto.randomUUID()
    try {
      const { error: submitError } = await client.functions.invoke('submit-website', {
        body: {
          original_url: url.trim(),
          suggested_categories: selected,
          description: description.trim() || null,
          request_id: requestIdRef.current,
        },
      })
      if (submitError) {
        const response = 'context' in submitError ? submitError.context : null
        const details = response instanceof Response ? await response.json().catch(() => null) as { message?: string } | null : null
        throw new Error(details?.message ?? 'The suggestion could not be sent. Please try again.')
      }
      setReceipt(true)
      requestIdRef.current = null
      onSubmitted?.()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The suggestion could not be sent. Please try again.') }
    finally { setBusy(false) }
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section aria-labelledby={titleId} aria-modal="true" className="modal-card submission-modal" onKeyDown={trapFocus} onMouseDown={(event) => event.stopPropagation()} ref={dialogRef} role="dialog">
        <div className="modal-heading">
          <div><p className="eyebrow">Share a find</p><h2 id={titleId}>Suggest a website</h2></div>
          <IconButton disabled={busy} icon={<X aria-hidden="true" />} label="Close website submission" onClick={close} ref={closeButtonRef} />
        </div>
        {receipt ? (
          <div role="status">
            <p>Thanks. Your suggestion is in the review queue. It will appear in discovery only after approval.</p>
            <button className="primary-button" onClick={close} type="button">Done</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            <p>Found an interesting corner of the web? Send it for review.</p>
            <label>Website URL
              <input autoComplete="url" maxLength={2048} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/" required type="url" value={url} />
            </label>
            <fieldset className="submission-categories">
              <legend>Suggested categories (optional)</legend>
              {categories.isPending && <p>Loading categories…</p>}
              {categories.isError && <p>Categories could not be loaded. You can still send the website.</p>}
              {categories.data?.map((category) => (
                <label key={category.id}>
                  <input checked={selected.includes(category.slug)} disabled={busy} onChange={(event) => setSelected((current) => event.target.checked ? [...current, category.slug] : current.filter((slug) => slug !== category.slug))} type="checkbox" />
                  {category.name}
                </label>
              ))}
            </fieldset>
            <label>Why is it worth sharing? (optional)
              <textarea maxLength={1000} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} />
            </label>
            {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
            <button className="primary-button" disabled={busy} type="submit">{busy ? 'Sending…' : 'Send suggestion'}</button>
          </form>
        )}
      </section>
    </div>
  )
}
