import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Bookmark, Check, Copy, Heart, LoaderCircle, ThumbsDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from '../../../components/IconButton'
import { rememberPendingAction } from '../../auth/pendingAction'
import { useAuth } from '../../auth/AuthProvider'
import { interactionAdapter } from '../../../lib/adapters/interactions'
import { DislikeDropdown } from './DislikeDropdown'

interface ReactionControlsProps {
  disabled: boolean
  onOpenAuth: () => void
  originalUrl?: string
  websiteId?: string
}

type ActionKind = 'love' | 'dislike' | 'bookmark'
type InteractionState = Awaited<ReturnType<typeof interactionAdapter.getState>>

export function ReactionControls({ disabled, onOpenAuth, originalUrl, websiteId }: ReactionControlsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [busyAction, setBusyAction] = useState<{ websiteId: string; kind: ActionKind } | null>(null)
  const inFlight = useRef(new Set<string>())
  const [error, setError] = useState<{ websiteId: string; message: string } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const copyFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (copyFeedbackTimeout.current) clearTimeout(copyFeedbackTimeout.current)
  }, [])
  const state = useQuery({
    queryKey: ['interaction', user?.id, websiteId],
    enabled: Boolean(user && websiteId),
    queryFn: () => interactionAdapter.getState(websiteId!),
  })
  const currentBusy = busyAction && busyAction.websiteId === websiteId ? busyAction.kind : null
  const actionDisabled = disabled || Boolean(user && !state.isSuccess)
  const bookmarked = state.data?.bookmarked === true
  const loved = state.data?.reaction === 'love'
  const disliked = state.data?.reaction === 'dislike'
  const copied = Boolean(originalUrl && copiedUrl === originalUrl)

  async function copyLink() {
    try {
      if (!originalUrl) throw new Error('The original URL is unavailable.')
      await navigator.clipboard.writeText(originalUrl)
      if (copyFeedbackTimeout.current) clearTimeout(copyFeedbackTimeout.current)
      setCopiedUrl(originalUrl)
      setError(null)
      copyFeedbackTimeout.current = setTimeout(() => setCopiedUrl(null), 2000)
    }
    catch {
      setCopiedUrl(null)
      setError({ websiteId: websiteId ?? '', message: 'The website link could not be copied.' })
    }
  }

  function openOriginal() {
    if (originalUrl) window.open(originalUrl, '_blank', 'noopener,noreferrer')
  }

  async function act(kind: ActionKind, reason?: string) {
    if (!websiteId || inFlight.current.has(websiteId)) return
    const targetId = websiteId
    if (!user) {
      rememberPendingAction({ kind, websiteId: targetId, reason })
      onOpenAuth()
      return
    }
    if (kind === 'dislike' && disliked && reason !== undefined && state.data?.reason === reason) return
    inFlight.current.add(targetId)
    setBusyAction({ websiteId: targetId, kind }); setError(null)
    const cacheKey = ['interaction', user.id, targetId] as const
    const previous = queryClient.getQueryData<InteractionState>(cacheKey) ?? state.data ?? {
      reaction: null, reason: null, bookmarked: false,
    }
    const next: InteractionState = kind === 'bookmark'
      ? { reaction: previous?.reaction ?? null, reason: previous?.reason ?? null, bookmarked: !bookmarked }
      : ((kind === 'love' && loved) || (kind === 'dislike' && disliked && reason === undefined))
        ? { reaction: null, reason: null, bookmarked: previous?.bookmarked ?? false }
        : { reaction: kind, reason: kind === 'dislike' ? reason ?? null : null, bookmarked: previous?.bookmarked ?? false }
    try {
      await queryClient.cancelQueries({ queryKey: cacheKey })
      queryClient.setQueryData(cacheKey, next)
      if (kind === 'bookmark') {
        if (bookmarked) await interactionAdapter.removeBookmark(targetId)
        else await interactionAdapter.saveBookmark(targetId)
      } else if ((kind === 'love' && loved) || (kind === 'dislike' && disliked && reason === undefined)) {
        await interactionAdapter.removeReaction(targetId)
      } else {
        await interactionAdapter.setReaction(targetId, kind, reason ?? null)
      }
      await queryClient.invalidateQueries({ queryKey: cacheKey })
      if (kind === 'bookmark') await queryClient.invalidateQueries({ queryKey: ['bookmarks', user.id] })
      await queryClient.invalidateQueries({ queryKey: ['recommendations', user.id] })
    } catch (cause) {
      queryClient.setQueryData(cacheKey, previous)
      setError({ websiteId: targetId, message: cause instanceof Error ? cause.message : 'The action could not be saved.' })
    }
    finally {
      inFlight.current.delete(targetId)
      setBusyAction((current) => current?.websiteId === targetId ? null : current)
    }
  }

  return (
    <div aria-busy={Boolean(currentBusy)} aria-label="Website actions" className="reaction-controls" role="group">
      <IconButton active={loved} aria-disabled={Boolean(currentBusy) || undefined} disabled={actionDisabled} icon={currentBusy === 'love' ? <LoaderCircle aria-hidden="true" className="reaction-icon--loading" /> : <Heart aria-hidden="true" className={loved ? 'reaction-icon--loved' : undefined} />} label="Love this website" onClick={() => void act('love')} />
      <IconButton disabled={disabled} icon={copied ? <Check aria-hidden="true" className="reaction-icon--saved" /> : <Copy aria-hidden="true" />} label="Copy link" onClick={() => void copyLink()} />
      <span className="sr-only" role="status">{copied ? 'Link copied' : ''}</span>
      <IconButton disabled={disabled || !originalUrl} icon={<ArrowUpRight aria-hidden="true" />} label="Open original website" onClick={openOriginal} />
      <IconButton active={bookmarked} aria-disabled={Boolean(currentBusy) || undefined} disabled={actionDisabled} icon={currentBusy === 'bookmark' ? <LoaderCircle aria-hidden="true" className="reaction-icon--loading" /> : bookmarked ? <Check aria-hidden="true" className="reaction-icon--saved" /> : <Bookmark aria-hidden="true" />} label="Bookmark this website" onClick={() => void act('bookmark')} />
      <div className="split-control">
        <IconButton active={disliked} aria-disabled={Boolean(currentBusy) || undefined} disabled={actionDisabled} icon={currentBusy === 'dislike' ? <LoaderCircle aria-hidden="true" className="reaction-icon--loading" /> : <ThumbsDown aria-hidden="true" className={disliked ? 'reaction-icon--disliked' : undefined} />} label="Dislike this website" onClick={() => void act('dislike')} />
        <DislikeDropdown busy={Boolean(currentBusy)} disabled={actionDisabled} onReasonSelected={(reason) => void act('dislike', reason)} />
      </div>
      {user && state.isError && <span className="reaction-error" role="alert">Website actions could not be loaded. <button className="text-button" onClick={() => void state.refetch()} type="button">Try again</button></span>}
      {error && error.websiteId === websiteId && <span className="reaction-error" role="alert">{error.message}</span>}
    </div>
  )
}
