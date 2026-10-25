import { EditIcon } from '@/components/frontend/icons'

/** Fixed bottom-right — same shell as header search, opens admin edit in new tab. */
export function EditDocFab({ href }: { href: string }) {
  return (
    <a
      aria-label="Upravit v administraci"
      className="btn-search fixed right-6 bottom-6 z-50"
      data-component="edit-doc-fab"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <EditIcon />
    </a>
  )
}
