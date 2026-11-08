import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Compass } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppState } from '../../../app/AppState'
import { paths } from '../../../app/paths'
import { MenuDismissLayer } from '../../../components/MenuDismissLayer'
import { catalogueAdapter } from '../../../lib/adapters'
import { CategoryIcon } from './CategoryIcon'

export function InterestSelector({ onSelect }: { onSelect?: () => void } = {}) {
  const { state, dispatch } = useAppState()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogueAdapter.listCategories })
  const selected = categories.data?.find((category) => category.id === state.selectedInterest)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(interestId: string) {
    dispatch({ type: 'interest-selected', interestId })
    setOpen(false)
    onSelect?.()
    triggerRef.current?.focus()
    if (location.pathname === '/' || location.pathname === paths.recent || location.pathname.startsWith('/category/')) {
      navigate(interestId === 'all' ? location.pathname === '/' ? paths.home : paths.recent : paths.category(interestId))
    }
  }

  return (
    <div className="interest-selector" ref={rootRef}>
      <button aria-controls={panelId} aria-expanded={open} aria-label="Discovery interest" className="interest-selector__trigger" onClick={() => setOpen((value) => !value)} ref={triggerRef} type="button">
        <span>{selected?.name ?? 'All interests'}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <MenuDismissLayer onDismiss={() => setOpen(false)} />
      )}
      {open && (
        <div aria-label="Choose a discovery interest" className="interest-selector__panel" id={panelId} style={{ backdropFilter: 'blur(34px) saturate(175%) brightness(1.08)' }}>
          <div className="interest-selector__heading">
            <strong>Explore interests</strong>
            <span>Pick a path for your next discovery</span>
          </div>
          <button aria-pressed={state.selectedInterest === 'all'} className="interest-option interest-option--all" onClick={() => choose('all')} type="button">
            <span aria-hidden="true" className="interest-option__icon"><Compass /></span>
            <span><strong>All interests</strong><small>A little bit of everything</small></span>
          </button>
          {categories.isPending && <p className="interest-selector__status">Loading interests…</p>}
          {categories.isError && <p className="interest-selector__status" role="alert">Interests could not be loaded. <button onClick={() => void categories.refetch()} type="button">Try again</button></p>}
          {categories.data && <div className="interest-selector__grid">
            {categories.data.map((category) => (
              <button aria-pressed={state.selectedInterest === category.id} className="interest-option" key={category.id} onClick={() => choose(category.id)} type="button">
                <span aria-hidden="true" className="interest-option__icon"><CategoryIcon slug={category.slug} /></span>
                <span><strong>{category.name}</strong><small>{category.description}</small></span>
              </button>
            ))}
          </div>}
        </div>
      )}
    </div>
  )
}
