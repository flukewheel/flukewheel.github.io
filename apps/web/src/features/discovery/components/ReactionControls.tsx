import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Copy, Heart, ThumbsDown } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '../../../components/IconButton'
import { rememberPendingAction } from '../../auth/pendingAction'
import { useAuth } from '../../auth/AuthProvider'
import { interactionAdapter } from '../../../lib/adapters/interactions'
import { DislikeDropdown } from './DislikeDropdown'

interface ReactionControlsProps {
  disabled: boolean
  onOpenAuth: () => void
  websiteId?: string
}

export function ReactionControls({ disabled, onOpenAuth, websiteId }: ReactionControlsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const state = useQuery({
    queryKey: ['interaction', user?.id, websiteId],
    enabled: Boolean(user && websiteId),
    queryFn: () => interactionAdapter.getState(websiteId!),
  })

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href) }
    catch { setError('The discovery link could not be copied.') }
  }

  async function act(kind: 'love' | 'dislike' | 'bookmark', reason?: string) {
    if (!websiteId || busy) return
    const targetId = websiteId
    if (!user) {
      rememberPendingAction({ kind, websiteId: targetId, reason })
      onOpenAuth()
      return
    }
    setBusy(true); setError(null)
    try {
      if (kind === 'bookmark') {
        if (state.data?.bookmarked) await interactionAdapter.removeBookmark(targetId)
        else await interactionAdapter.saveBookmark(targetId)
      } else if (!reason && state.data?.reaction === kind) await interactionAdapter.removeReaction(targetId)
      else await interactionAdapter.setReaction(targetId, kind, reason ?? null)
      await queryClient.invalidateQueries({ queryKey: ['interaction', user.id, targetId] })
      if (kind === 'bookmark') await queryClient.invalidateQueries({ queryKey: ['bookmarks', user.id] })
      await queryClient.invalidateQueries({ queryKey: ['recommendations', user.id] })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The action could not be saved.') }
    finally { setBusy(false) }
  }

  return (
    <div aria-busy={busy} aria-label="Website actions" className="reaction-controls" role="group">
      <IconButton active={state.data?.reaction === 'love'} disabled={disabled || busy} icon={<Heart aria-hidden="true" />} label="Love this website" onClick={() => void act('love')} />
      <IconButton disabled={disabled} icon={<Copy aria-hidden="true" />} label="Copy discovery link" onClick={() => void copyLink()} />
      <IconButton active={state.data?.bookmarked} disabled={disabled || busy} icon={<Bookmark aria-hidden="true" />} label="Bookmark this website" onClick={() => void act('bookmark')} />
      <div className="split-control">
        <IconButton active={state.data?.reaction === 'dislike'} disabled={disabled || busy} icon={<ThumbsDown aria-hidden="true" />} label="Dislike this website" onClick={() => void act('dislike')} />
        <DislikeDropdown disabled={disabled || busy} onReasonSelected={(reason) => void act('dislike', reason)} />
      </div>
      {error && <span className="sr-only" role="alert">{error}</span>}
    </div>
  )
}
