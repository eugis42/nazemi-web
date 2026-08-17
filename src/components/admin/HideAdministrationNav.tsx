'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect } from 'react'

import { ADMIN_NAV_ADMINISTRATION, ADMIN_NAV_SITE_SETTINGS } from '@/lib/admin-nav-groups'

function isHiddenGroupLabel(text: string): boolean {
  return (
    text === ADMIN_NAV_ADMINISTRATION
    || text === ADMIN_NAV_SITE_SETTINGS
    || text.startsWith(`${ADMIN_NAV_SITE_SETTINGS} `)
  )
}

function toggleHidden(el: HTMLElement, hide: boolean) {
  el.classList.toggle('nazemi-nav-hidden', hide)
}

function apply(hide: boolean) {
  const wrap = document.querySelector('.nav__wrap')
  if (wrap) {
    for (const group of wrap.querySelectorAll(':scope > .nav-group')) {
      const label = group.querySelector('.nav-group__label')
      if (!(label instanceof HTMLElement) || !(group instanceof HTMLElement)) continue
      const text = label.textContent?.trim() ?? ''
      if (!isHiddenGroupLabel(text)) continue
      toggleHidden(group, hide)
    }
  }

  for (const labelEl of document.querySelectorAll('.collections__label')) {
    if (!(labelEl instanceof HTMLElement)) continue
    const text = labelEl.textContent?.trim() ?? ''
    if (!isHiddenGroupLabel(text)) continue
    const group = labelEl.closest('.collections__group')
    if (group instanceof HTMLElement) toggleHidden(group, hide)
  }
}

/** Editors must not see Nastavení webu or Administrace. */
export function HideAdministrationNav() {
  const { user } = useAuth()
  const hide = Boolean(user) && (user as { role?: string }).role !== 'admin'

  useEffect(() => {
    let raf = 0
    let observer: MutationObserver | undefined

    const attach = () => {
      cancelAnimationFrame(raf)
      apply(hide)
      const wrap = document.querySelector('.nav__wrap')
      if (!wrap) {
        raf = requestAnimationFrame(attach)
        return
      }
      observer = new MutationObserver(() => {
        apply(hide)
      })
      observer.observe(wrap, { childList: true, subtree: true })
      const shell = document.querySelector('.template-default')
      if (shell) observer.observe(shell, { childList: true, subtree: true })
    }

    attach()

    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
      apply(false)
    }
  }, [hide])

  return null
}
