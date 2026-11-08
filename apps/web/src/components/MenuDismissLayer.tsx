import { createPortal } from 'react-dom'

export function MenuDismissLayer({ onDismiss }: { onDismiss: () => void }) {
  return createPortal(
    <div aria-hidden="true" className="menu-dismiss-layer" onPointerDown={onDismiss} />,
    document.body,
  )
}
