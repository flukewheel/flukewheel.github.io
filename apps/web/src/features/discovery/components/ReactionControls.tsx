import { Bookmark, Copy, Heart, ThumbsDown } from 'lucide-react'
import { IconButton } from '../../../components/IconButton'
import { DislikeDropdown } from './DislikeDropdown'

interface ReactionControlsProps {
  activeUrl?: string
  disabled: boolean
}

export function ReactionControls({ activeUrl, disabled }: ReactionControlsProps) {
  async function copyLink() {
    if (!activeUrl) return
    await navigator.clipboard.writeText(activeUrl)
  }

  return (
    <div aria-label="Website actions" className="reaction-controls" role="group">
      <IconButton
        disabled={disabled}
        icon={<Heart aria-hidden="true" />}
        label="Love this website"
      />
      <IconButton
        disabled={disabled}
        icon={<Copy aria-hidden="true" />}
        label="Copy original website link"
        onClick={() => void copyLink()}
      />
      <IconButton
        disabled={disabled}
        icon={<Bookmark aria-hidden="true" />}
        label="Bookmark this website"
      />
      <div className="split-control">
        <IconButton
          disabled={disabled}
          icon={<ThumbsDown aria-hidden="true" />}
          label="Dislike this website"
        />
        <DislikeDropdown disabled={disabled} />
      </div>
    </div>
  )
}
