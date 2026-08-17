'use client'

import { useEffect } from 'react'

import {
  SITE_SETTINGS_QUERY,
  SITE_SETTINGS_TAB_LABELS,
  SITE_SETTINGS_TABS,
  type SiteSettingsTabKey,
} from '@/lib/site-settings-nav'

const WEBY_DEFAULT_TAB = 'Obecné'
const ACTIVE_CLASS = 'tabs-field__tab-button--active'

function getFocusTabKey(): SiteSettingsTabKey | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get(SITE_SETTINGS_QUERY)
  if (value && value in SITE_SETTINGS_TABS) {
    return value as SiteSettingsTabKey
  }
  return null
}

function locationKey(): string {
  return `${window.location.pathname}?${window.location.search}`
}

function tabButtonLabel(button: Element): string {
  return (button.textContent || '').replace(/\d+/g, '').trim()
}

function isSettingsTabLabel(label: string): boolean {
  return (SITE_SETTINGS_TAB_LABELS as readonly string[]).includes(label)
}

function setDisplay(button: HTMLElement, display: '' | 'none') {
  if (button.style.display !== display) {
    button.style.display = display
  }
}

/**
 * Sidebar "Nastavení webu" deep-links `?siteSettings=navigace|kontakt|paticka`.
 * - With param: show + force that field tab (retry — Payload tab prefs load async)
 * - Without: hide settings tabs; if prefs restored one, snap back to Obecné
 *
 * No `next/navigation` hooks — keeps admin client islands Turbopack-safe.
 */
export function SitesEditTabFocus() {
  useEffect(() => {
    let raf = 0
    let bootIntervalId = 0
    let urlPollId = 0
    let debounceId = 0
    let observer: MutationObserver | undefined
    let applying = false
    let lastKey = ''

    const apply = () => {
      if (applying) return
      applying = true
      try {
        lastKey = locationKey()
        const focusKey = getFocusTabKey()
        const focusLabel = focusKey ? SITE_SETTINGS_TABS[focusKey] : null

        const buttons = [
          ...document.querySelectorAll('.tabs-field__tab-button'),
        ].filter((el): el is HTMLElement => el instanceof HTMLElement)

        if (!buttons.length) return

        if (focusLabel) {
          let target: HTMLElement | null = null

          for (const button of buttons) {
            const label = tabButtonLabel(button)
            const show = label === focusLabel
            setDisplay(button, show ? '' : 'none')
            if (show) target = button
          }

          if (target && !target.classList.contains(ACTIVE_CLASS)) {
            target.click()
          }
          return
        }

        let activeSettings = false
        let defaultTab: HTMLElement | null = null

        for (const button of buttons) {
          const label = tabButtonLabel(button)
          if (isSettingsTabLabel(label)) {
            setDisplay(button, 'none')
            if (button.classList.contains(ACTIVE_CLASS)) {
              activeSettings = true
            }
          } else {
            setDisplay(button, '')
            if (label === WEBY_DEFAULT_TAB) {
              defaultTab = button
            }
          }
        }

        if (activeSettings && defaultTab && !defaultTab.classList.contains(ACTIVE_CLASS)) {
          defaultTab.click()
        }
      } finally {
        applying = false
      }
    }

    const scheduleApply = () => {
      window.clearTimeout(debounceId)
      debounceId = window.setTimeout(apply, 16)
    }

    const attachObserver = () => {
      const root =
        document.querySelector('.collection-edit.collection-edit--sites')
        || document.querySelector('.document-fields')
        || document.body
      observer?.disconnect()
      observer = new MutationObserver(scheduleApply)
      observer.observe(root, {
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
        subtree: true,
      })
    }

    apply()
    attachObserver()

    // Payload Tabs restore preferred index async after mount
    const started = Date.now()
    bootIntervalId = window.setInterval(() => {
      apply()
      if (Date.now() - started > 2500) {
        window.clearInterval(bootIntervalId)
        bootIntervalId = 0
      }
    }, 50)

    // App Router soft navigations may not fire popstate
    urlPollId = window.setInterval(() => {
      if (locationKey() !== lastKey) {
        apply()
        attachObserver()
      }
    }, 200)

    raf = requestAnimationFrame(() => {
      apply()
      attachObserver()
    })

    window.addEventListener('popstate', scheduleApply)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(debounceId)
      if (bootIntervalId) window.clearInterval(bootIntervalId)
      window.clearInterval(urlPollId)
      window.removeEventListener('popstate', scheduleApply)
      observer?.disconnect()
    }
  }, [])

  return null
}
