import type { Site } from '@/payload-types'
import type { NestedMenuItem } from '@/lib/menu-tree'
import { nestMenuItems } from '@/lib/menu-tree'
import {
  resolveNavReferenceHref,
  resolveNavTarget,
  type ResolvedNavTarget,
} from '@/lib/nav-target'

export { resolveNavReferenceHref }

type FlatMenuItem = NonNullable<Site['mainMenu']>[number]
export type MenuItem = NestedMenuItem<Omit<FlatMenuItem, 'depth'>>
type AnyMenuItem = MenuItem | NonNullable<MenuItem['children']>[number]

/** Resolve nav item for FE — link or form modal. */
export function resolveMenuItem(
  item: AnyMenuItem | null | undefined,
): ResolvedNavTarget | null {
  if (!item) return null
  return resolveNavTarget({
    href: item.href,
    label: item.label,
    linkType: item.linkType,
    reference: item.reference,
  })
}

/** Nest flat mainMenu (depth) for header / breadcrumbs. */
export function nestedMainMenu(items: Site['mainMenu']): MenuItem[] {
  return nestMenuItems<Omit<FlatMenuItem, 'depth'>>(items || [])
}
