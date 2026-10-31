import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { adminApi, type ManagedCategory } from './adminApi'

function CategoryEditor({ category, onSaved }: { category: ManagedCategory | null; onSaved: () => Promise<void> }) {
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [active, setActive] = useState(category?.active ?? true)
  const [order, setOrder] = useState(category?.display_order ?? 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true); setError(null)
    try {
      await adminApi.saveCategory({
        category_id: category?.id ?? null, slug: slug.trim(), name: name.trim(),
        description: description.trim(), active, display_order: order,
      })
      await onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The category could not be saved.') }
    finally { setBusy(false) }
  }

  return (
    <section aria-label={category ? `Edit ${category.name}` : 'Create category'} className="admin-review">
      <h2>{category ? 'Edit category' : 'Create category'}</h2>
      <div className="admin-review__fields">
        <label>Slug<input maxLength={64} onChange={(event) => setSlug(event.target.value)} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} /></label>
        <label>Name<input maxLength={80} onChange={(event) => setName(event.target.value)} value={name} /></label>
        <label>Description<textarea maxLength={300} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} /></label>
        <label>Display order<input max={10000} min={-10000} onChange={(event) => setOrder(Number(event.target.value))} type="number" value={order} /></label>
        <label className="admin-review__check"><input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />Active category</label>
      </div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy || !slug.trim() || !name.trim() || !description.trim()} onClick={() => void save()} type="button">{busy ? 'Saving…' : 'Save category'}</button>
    </section>
  )
}

export function CategoryManager() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const categories = useQuery({ queryKey: ['admin-categories', user?.id], queryFn: adminApi.categories })
  const selected = creating ? null : categories.data?.find((category) => category.id === selectedId) ?? categories.data?.[0] ?? null

  async function saved() {
    setMessage('Category saved.')
    setCreating(false)
    await categories.refetch()
    await queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  return (
    <section>
      {message && <p className="auth-feedback" role="status">{message}</p>}
      {categories.isPending && <p>Loading categories…</p>}
      {categories.isError && <p role="alert">Categories could not be loaded.</p>}
      <div className="admin-page__layout">
        <nav aria-label="Catalogue categories" className="admin-queue">
          <h2>Categories</h2>
          <button aria-current={creating ? 'true' : undefined} onClick={() => { setCreating(true); setSelectedId(null); setMessage(null) }} type="button"><strong>+ New category</strong></button>
          {categories.data?.map((category) => (
            <button aria-current={!creating && selected?.id === category.id ? 'true' : undefined} key={category.id} onClick={() => { setCreating(false); setSelectedId(category.id); setMessage(null) }} type="button">
              <strong>{category.name}</strong><small>{category.active ? 'Active' : 'Inactive'} · order {category.display_order}</small>
            </button>
          ))}
        </nav>
        {(creating || selected) && <CategoryEditor category={selected} key={creating ? 'new' : selected?.id} onSaved={saved} />}
      </div>
    </section>
  )
}
