'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { Site } from '@/payload-types'
import { CaretDownIcon, CaretRightIcon, SearchIcon } from '@/components/frontend/icons'
import { withSiteQuery } from '@/lib/content'
import { resolveMenuItem } from '@/lib/menu'

type MenuItem = NonNullable<Site['mainMenu']>[number]
type SecondaryItem = NonNullable<Site['secondaryMenu']>[number]

const MENU_ANIM_MS = 250
const SUBMENU_ANIM_MS = 200
/** Matches the `gap-x-5` between nav items — the wrap math needs it in pixels. */
const NAV_GAP_PX = 20
const NAV_ROW_ATTR = 'data-nav-row'

function isActiveHref(pathname: string, href?: string | null) {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
    return false
  }
  const target = href.split('?')[0].replace(/\/$/, '') || '/'
  if (target === '/') return pathname === '/'
  return pathname === target || pathname.startsWith(`${target}/`)
}

function evenRowSizes(itemCount: number, rowCount: number) {
  const base = Math.floor(itemCount / rowCount)
  const extra = itemCount % rowCount
  return Array.from({ length: rowCount }, (_, index) => base + (index < extra ? 1 : 0))
}

function measureItemsRowWidth(items: HTMLElement[], gapPx = NAV_GAP_PX) {
  if (!items.length) return 0
  return items.reduce(
    (sum, item, index) => sum + item.offsetWidth + (index > 0 ? gapPx : 0),
    0,
  )
}

function measureLinkWidth(item: HTMLElement) {
  if (item.matches('[data-component="nav-link"]')) return item.offsetWidth
  const slot = item.querySelector<HTMLElement>('[data-nav-slot]')
  return slot?.offsetWidth ?? item.offsetWidth
}

function getTopLevelMenuItems(main: HTMLElement) {
  const rows = [...main.querySelectorAll<HTMLElement>(`[${NAV_ROW_ATTR}]`)]
  const source = rows.length
    ? rows.flatMap((row) => [...row.children] as HTMLElement[])
    : ([...main.children] as HTMLElement[])

  return source.filter(
    (child) =>
      child.matches('[data-component="nav-link"]') || child.matches('[data-component="nav-item"]'),
  )
}

function balancedBreakAfterIndices(items: HTMLElement[], availableWidth: number) {
  const itemCount = items.length
  if (itemCount < 2) return [] as number[]

  for (let rowCount = 2; rowCount <= itemCount; rowCount += 1) {
    const sizes = evenRowSizes(itemCount, rowCount)
    let offset = 0
    let fits = true

    for (const size of sizes) {
      const rowItems = items.slice(offset, offset + size)
      const widths = rowItems.map((item) => {
        const width = measureLinkWidth(item)
        // Temporarily stash so we can sum without re-querying layout mid-loop.
        return width
      })
      const rowWidth = widths.reduce(
        (sum, width, index) => sum + width + (index > 0 ? NAV_GAP_PX : 0),
        0,
      )
      if (rowWidth > availableWidth + 0.5) {
        fits = false
        break
      }
      offset += size
    }

    if (fits) {
      const indices: number[] = []
      let count = 0
      for (let index = 0; index < sizes.length - 1; index += 1) {
        count += sizes[index]
        indices.push(count - 1)
      }
      return indices
    }
  }

  return [] as number[]
}

function clearMainMenuRows(main: HTMLElement) {
  main.querySelectorAll(`[${NAV_ROW_ATTR}]`).forEach((row) => {
    while (row.firstChild) main.appendChild(row.firstChild)
    row.remove()
  })
}

function applyMainMenuRows(main: HTMLElement, breakAfterIndices: number[]) {
  const items = getTopLevelMenuItems(main)
  const groups: Array<[number, number]> = []
  let start = 0
  for (const breakIndex of breakAfterIndices) {
    groups.push([start, breakIndex + 1])
    start = breakIndex + 1
  }
  groups.push([start, items.length])

  const signature = groups.map(([from, to]) => to - from).join(',')
  const existing = [...main.querySelectorAll(`[${NAV_ROW_ATTR}]`)]
    .map((row) => row.children.length)
    .join(',')
  if (signature === existing) return

  clearMainMenuRows(main)
  const ordered = getTopLevelMenuItems(main)

  for (const [from, to] of groups) {
    const row = document.createElement('div')
    row.setAttribute(NAV_ROW_ATTR, '')
    row.className = 'flex flex-row flex-wrap items-center justify-end gap-x-5'
    ordered.slice(from, to).forEach((item) => row.appendChild(item))
    main.appendChild(row)
  }
}

function measureRowWidth(container: HTMLElement) {
  const links = getTopLevelMenuItems(container).map((item) => {
    if (item.matches('[data-component="nav-link"]')) return item
    return item.querySelector<HTMLElement>('[data-nav-slot]') ?? item
  })
  return measureItemsRowWidth(links)
}

function navLinkAttrs(active: boolean) {
  return active
    ? ({ 'aria-current': 'page' as const, 'data-active': 'true' as const })
    : {}
}

function SearchButton({ siteSlug }: { siteSlug: string }) {
  return (
    <a
      aria-label="Vyhledávání"
      className="btn-search"
      data-component="search-button"
      href={withSiteQuery('/hledat', siteSlug)}
    >
      <SearchIcon />
    </a>
  )
}

export function SiteHeader({
  logoAlt,
  logoUrl,
  mainMenu,
  secondaryMenu,
  siteName,
  siteSlug,
}: {
  logoAlt?: string
  logoUrl?: string | null
  mainMenu?: MenuItem[] | null
  secondaryMenu?: SecondaryItem[] | null
  siteName: string
  siteSlug: string
}) {
  const headerRef = useRef<HTMLElement>(null)
  const mainMenuRef = useRef<HTMLDivElement>(null)
  const [navState, setNavState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed')
  const [expanded, setExpanded] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null)
  const [closingSubmenu, setClosingSubmenu] = useState<number | null>(null)
  const pathname = usePathname()
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOpen = navState !== 'closed'
  const items = useMemo(() => mainMenu || [], [mainMenu])

  const syncOffset = useCallback(() => {
    const header = headerRef.current
    if (!header) return

    const mobile = window.matchMedia('(max-width: 1023px)').matches
    const menubar = header.querySelector<HTMLElement>('[data-component="mobile-menubar"]')
    const navOpen =
      header.hasAttribute('data-nav-open') ||
      header.hasAttribute('data-nav-opening') ||
      header.hasAttribute('data-nav-closing')

    // Closed: full header (includes mobile pb-3) so breadcrumbs clear the fixed bar.
    // Open: menubar only — expanded nav must not inflate --site-header-offset.
    let offset = header.offsetHeight
    if (mobile && menubar && navOpen) {
      const pb = Number.parseFloat(getComputedStyle(header).paddingBottom) || 0
      offset = menubar.offsetHeight + pb
    }

    document.documentElement.style.setProperty('--site-header-offset', `${offset}px`)

    if (menubar && mobile) {
      const headerRect = header.getBoundingClientRect()
      const menubarRect = menubar.getBoundingClientRect()
      header.style.setProperty('--mobile-menubar-bottom', `${menubarRect.bottom - headerRect.top}px`)
    } else {
      header.style.removeProperty('--mobile-menubar-bottom')
    }
  }, [])


  useEffect(() => {
    syncOffset()
    window.addEventListener('resize', syncOffset)

    let observer: ResizeObserver | undefined
    if (headerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncOffset)
      observer.observe(headerRef.current)
    }

    return () => {
      window.removeEventListener('resize', syncOffset)
      observer?.disconnect()
    }
  }, [syncOffset])

  // Desktop nav wrap — port of design `js/nav.js` `syncNavWrap` (DOM rows after React commit).
  useLayoutEffect(() => {
    const main = mainMenuRef.current
    const nav = document.getElementById('site-nav')
    if (!main || !nav) return undefined

    const syncNavWrap = () => {
      clearMainMenuRows(main)

      if (!window.matchMedia('(min-width: 1024px)').matches) {
        nav.removeAttribute('data-nav-wrapped')
        return
      }

      const secondary = nav.querySelector<HTMLElement>('[data-component="secondary-menu"]')
      const separator = nav.querySelector<HTMLElement>('[data-component="nav-menu-separator"]')
      const separatorWidth = separator?.offsetWidth ?? 0
      const secondaryRowWidth = secondary ? measureRowWidth(secondary) : 0
      const mainRowWidth = measureRowWidth(main)
      const navWidth = nav.clientWidth
      const gaps = NAV_GAP_PX * 2
      const mainAvailableWidth = navWidth - separatorWidth - secondaryRowWidth - gaps
      const wrapped = mainRowWidth > mainAvailableWidth + 0.5

      nav.toggleAttribute('data-nav-wrapped', wrapped)
      if (wrapped) {
        applyMainMenuRows(main, balancedBreakAfterIndices(getTopLevelMenuItems(main), mainAvailableWidth))
      }
      syncOffset()
    }

    syncNavWrap()
    window.addEventListener('resize', syncNavWrap)
    void document.fonts?.ready.then(syncNavWrap)

    return () => {
      window.removeEventListener('resize', syncNavWrap)
      clearMainMenuRows(main)
      nav.removeAttribute('data-nav-wrapped')
    }
  }, [items, pathname, syncOffset])

  useEffect(() => {
    if (navState === 'opening') {
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setExpanded(true))
      })
      const timer = setTimeout(() => setNavState('open'), MENU_ANIM_MS)
      return () => {
        cancelAnimationFrame(frame)
        clearTimeout(timer)
      }
    }

    if (navState === 'closing') {
      const timer = setTimeout(() => setNavState('closed'), MENU_ANIM_MS)
      return () => clearTimeout(timer)
    }

    return undefined
  }, [navState])

  // Keep --site-header-offset in sync with open/closed mobile menu (attrs drive the measure).
  useEffect(() => {
    syncOffset()
  }, [navState, syncOffset])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) return
      setOpenSubmenu(null)
      setClosingSubmenu(null)
      setExpanded(false)
      setNavState('closed')
    }
    desktop.addEventListener('change', onChange)
    return () => desktop.removeEventListener('change', onChange)
  }, [])

  const startClose = useCallback(() => {
    setOpenSubmenu(null)
    setClosingSubmenu(null)
    setExpanded(false)
    setNavState('closing')
  }, [])

  const closeSubmenu = useCallback(() => {
    if (openSubmenu === null) return
    const index = openSubmenu
    setOpenSubmenu(null)
    setClosingSubmenu(index)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setClosingSubmenu(null)
      closeTimerRef.current = null
    }, SUBMENU_ANIM_MS)
  }, [openSubmenu])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (openSubmenu !== null || closingSubmenu !== null) {
        closeSubmenu()
        return
      }
      startClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, openSubmenu, closingSubmenu, closeSubmenu, startClose])

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    },
    [],
  )

  const closeNav = () => {
    setOpenSubmenu(null)
    setClosingSubmenu(null)
    setNavState('closed')
    setExpanded(false)
  }

  const headerAttrs = {
    ...(navState === 'open' || navState === 'opening' || navState === 'closing'
      ? { 'data-nav-open': '' }
      : {}),
    ...(navState === 'opening' ? { 'data-nav-opening': '' } : {}),
    ...(navState === 'closing' ? { 'data-nav-closing': '' } : {}),
  }

  const renderMainItems = (list: MenuItem[], indexOffset = 0) =>
    list.map((item, localIndex) => {
      const index = indexOffset + localIndex
      const resolved = resolveMenuItem(item)
      if (!resolved) return null
      const childActive = Boolean(
        item.children?.some((child) => {
          const childResolved = resolveMenuItem(child)
          return childResolved && isActiveHref(pathname, childResolved.href)
        }),
      )
      const active = isActiveHref(pathname, resolved.href) || childActive

      return (
        <NavItem
          closing={closingSubmenu === index}
          index={index}
          isActive={active}
          isSubmenuOpen={openSubmenu === index}
          item={item}
          key={`${resolved.href}-${index}`}
          onCloseNav={closeNav}
          onCloseSubmenu={closeSubmenu}
          onOpenSubmenu={() => {
            setClosingSubmenu(null)
            setOpenSubmenu(index)
          }}
          siteSlug={siteSlug}
        />
      )
    })


  return (
    <header
      className="border-ground fixed inset-x-0 top-0 z-50 border-0 border-b-2 border-b-ground bg-sky max-lg:pt-0 max-lg:pb-3 lg:overflow-visible lg:py-0"
      data-component="site-header"
      ref={headerRef}
      {...headerAttrs}
    >
      <div className="container">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-x-0 pl-2.5 pr-[15px] lg:items-stretch lg:border-x-2 lg:border-x-ground">
          <div
            className="max-lg:relative max-lg:z-30 max-lg:flex max-lg:w-full max-lg:items-center max-lg:gap-x-5 max-lg:bg-sky max-lg:pt-3 lg:contents"
            data-component="mobile-menubar"
          >
            <div className="flex shrink-0 items-center gap-2.5 lg:self-stretch">
              <Link
                aria-label={`${siteName} — domů`}
                className="inline-block shrink-0"
                data-component="logo"
                href={withSiteQuery('/', siteSlug)}
                onClick={closeNav}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={logoAlt || siteName}
                    className="h-[45px] w-auto lg:h-[57px]"
                    height={57}
                    src={logoUrl}
                    width={116}
                  />
                ) : (
                  <span className="font-saans text-xl text-ground">{siteName}</span>
                )}
              </Link>
              <div
                aria-hidden="true"
                className="hidden h-[76px] w-[2px] shrink-0 bg-ground lg:block"
                data-component="menubar-separator"
              />
            </div>

            <div className="ms-auto flex shrink-0 items-center gap-2.5 lg:hidden">
              <SearchButton siteSlug={siteSlug} />
              <button
                aria-controls="site-nav"
                aria-expanded={isOpen}
                aria-label="Menu"
                className="btn-nav-toggle"
                data-nav-toggle
                onClick={() => {
                  if (navState === 'opening' || navState === 'closing') return
                  if (isOpen) {
                    startClose()
                    return
                  }
                  setNavState('opening')
                }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="block h-0.5 w-5 bg-sky shadow-[0_-6px_0_0_#f3ffff,0_6px_0_0_#f3ffff] transition-[background-color,box-shadow] duration-150 ease-out"
                />
              </button>
            </div>
          </div>

          <div
            className={`mobile-nav-shell max-lg:w-full lg:contents ${isOpen ? 'is-active' : ''} ${expanded ? 'is-expanded' : ''} ${navState === 'closing' ? 'is-closing' : ''}`}
            data-component="mobile-nav-shell"
          >
            <nav
              aria-label="Hlavní navigace"
              className={`${
                navState === 'closed' ? 'hidden' : 'flex'
              } w-full flex-col gap-4 max-lg:py-4 lg:flex lg:min-w-0 lg:flex-1 lg:flex-row lg:flex-nowrap lg:items-stretch lg:justify-end lg:gap-x-5 lg:overflow-visible lg:py-0`}
              data-nav-panel
              id="site-nav"
            >
              <div
                className="flex w-full flex-col gap-4 lg:w-auto lg:min-w-0 lg:flex-1 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-x-5 lg:gap-y-1"
                data-component="main-menu"
                ref={mainMenuRef}
              >
                {renderMainItems(items)}
              </div>
              <div
                aria-hidden="true"
                className="w-[2px] shrink-0 self-stretch bg-ground max-lg:hidden"
                data-component="nav-menu-separator"
              />
              <div
                className="flex w-full gap-4 max-lg:flex-col lg:w-auto lg:shrink-0 lg:gap-x-5 lg:gap-y-1"
                data-component="secondary-menu"
              >
                {secondaryMenu?.map((item, index) => {
                  const resolved = resolveMenuItem(item)
                  if (!resolved) return null
                  const { external, href, label } = resolved
                  const active = !external && isActiveHref(pathname, href)
                  return (
                    <a
                      className=""
                      data-component="nav-link"
                      data-variant={external ? 'external' : 'default'}
                      href={external ? href : withSiteQuery(href, siteSlug)}
                      key={`${href}-${index}`}
                      onClick={closeNav}
                      rel={external ? 'noopener noreferrer' : undefined}
                      target={external ? '_blank' : undefined}
                      {...navLinkAttrs(active)}
                    >
                      {external ? `↗ ${label}` : label}
                    </a>
                  )
                })}
              </div>
            </nav>
          </div>

          <div className="hidden shrink-0 lg:flex lg:items-center" data-component="header-search">
            <SearchButton siteSlug={siteSlug} />
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mobile-nav-divider lg:hidden"
        data-component="mobile-nav-divider"
      />
    </header>
  )
}

function NavItem({
  closing,
  isActive,
  isSubmenuOpen,
  item,
  onCloseNav,
  onCloseSubmenu,
  onOpenSubmenu,
  siteSlug,
}: {
  closing: boolean
  index: number
  isActive: boolean
  isSubmenuOpen: boolean
  item: MenuItem
  onCloseNav: () => void
  onCloseSubmenu: () => void
  onOpenSubmenu: () => void
  siteSlug: string
}) {
  const pathname = usePathname()
  const resolved = resolveMenuItem(item)
  if (!resolved) return null
  const href = withSiteQuery(resolved.href, siteSlug)
  const activeAttrs = navLinkAttrs(isActive)
  const children = (item.children || [])
    .map((child, childIndex) => {
      const childResolved = resolveMenuItem(child)
      if (!childResolved) return null
      const childActive = isActiveHref(pathname, childResolved.href)
      return (
        <Link
          className="nav-submenu-link"
          data-component="nav-link"
          data-nav-level="2"
          href={withSiteQuery(childResolved.href, siteSlug)}
          key={`${childResolved.href}-${childIndex}`}
          onClick={onCloseNav}
          {...navLinkAttrs(childActive)}
        >
          {childResolved.label}
        </Link>
      )
    })
    .filter(Boolean)

  if (!children.length) {
    return (
      <Link
        className=""
        data-component="nav-link"
        href={href}
        onClick={onCloseNav}
        {...activeAttrs}
      >
        {resolved.label}
      </Link>
    )
  }

  const panelOpen = isSubmenuOpen || closing

  return (
    <div
      className="nav-item w-full lg:relative lg:inline-flex lg:w-auto lg:self-center"
      data-component="nav-item"
      {...(isSubmenuOpen ? { 'data-nav-submenu-open': '' } : {})}
    >
      <a
        className="nav-item-trigger"
        data-component="nav-link"
        data-has-submenu="true"
        data-nav-level="1"
        data-nav-slot
        href={href}
        onClick={(event) => {
          if (!window.matchMedia('(max-width: 1023px)').matches) return
          event.preventDefault()
          onOpenSubmenu()
        }}
        {...activeAttrs}
      >
        <span>{resolved.label}</span>
        <span aria-hidden="true" className="nav-item-carets shrink-0">
          <CaretDownIcon />
          <CaretRightIcon />
        </span>
      </a>

      <div className="nav-item-panel max-lg:hidden" data-component="nav-item-panel">
        <div data-component="nav-submenu">{children}</div>
      </div>

      {panelOpen ? (
        <div
          aria-hidden={!isSubmenuOpen}
          className={`nav-mobile-panel lg:hidden${closing ? ' nav-mobile-panel--closing' : ''}`}
          data-component="nav-mobile-panel"
        >
          <div className="nav-mobile-panel-inner">
            <button className="nav-mobile-back" data-nav-back onClick={onCloseSubmenu} type="button">
              ← Zpět
            </button>
            <div data-component="nav-submenu">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
