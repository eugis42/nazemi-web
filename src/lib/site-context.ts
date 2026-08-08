import type { PayloadRequest, Where } from 'payload'

export const ADMIN_SITE_COOKIE = 'nazemi-site'
export const MAIN_SITE_SLUG = 'nazemi'
/** Set by middleware from `?site=` or host subdomain — readable in root layout. */
export const FRONTEND_SITE_HEADER = 'x-nazemi-site'

const disabledSiteSlug = '__no_active_site__'

const parseCookieString = (cookieHeader?: null | string) => {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, entry) => {
    const [rawKey, ...rest] = entry.trim().split('=')
    if (!rawKey || rest.length === 0) {
      return acc
    }

    acc[rawKey] = decodeURIComponent(rest.join('='))
    return acc
  }, {})
}

export const getCookieValue = (cookieHeader: null | string | undefined, key: string) =>
  parseCookieString(cookieHeader)[key]

export const getAdminSiteSlugFromRequest = (req: PayloadRequest) => {
  const headerValue =
    typeof req.headers?.get === 'function'
      ? req.headers.get('cookie')
      : ((req.headers as unknown as Record<string, string | string[] | undefined> | undefined)?.cookie as
          | string
          | undefined)

  return getCookieValue(headerValue, ADMIN_SITE_COOKIE) || MAIN_SITE_SLUG
}

export const getSiteFilter = (siteSlug?: string | null): Where => {
  if (!siteSlug) {
    return { site: { equals: disabledSiteSlug } }
  }

  return {
    'site.slug': {
      equals: siteSlug,
    },
  }
}

export const getScopedBaseFilter = ({
  allowMainSiteOnly = false,
  /** Main-web list also includes sub-web docs with “Zobrazit i na hlavním webu”. */
  includeCrossPostedOnMain = false,
}: {
  allowMainSiteOnly?: boolean
  includeCrossPostedOnMain?: boolean
} = {}) => {
  return ({ req }: { req: PayloadRequest }): Where => {
    const activeSiteSlug = getAdminSiteSlugFromRequest(req)

    if (allowMainSiteOnly && activeSiteSlug !== MAIN_SITE_SLUG) {
      return {
        site: {
          equals: disabledSiteSlug,
        },
      }
    }

    if (includeCrossPostedOnMain && activeSiteSlug === MAIN_SITE_SLUG) {
      return {
        or: [
          getSiteFilter(activeSiteSlug),
          { showOnMainSite: { equals: true } },
        ],
      }
    }

    return getSiteFilter(activeSiteSlug)
  }
}

/** Host → site slug candidate (subdomain label). */
export const siteSlugFromHost = (host?: null | string): null | string => {
  if (!host) return null
  const hostname = host.split(':')[0]
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null

  const parts = hostname.split('.')

  // brno.localhost → brno (local subdomain testing)
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
    return parts[0] || null
  }

  // brno.nazemi.cz → brno
  if (parts.length > 2) {
    return parts[0] || null
  }

  return null
}

/**
 * Public site slug priority: query → middleware header → host subdomain.
 * Admin cookie is NOT used here (avoids bleed onto public frontend).
 */
export const getFrontendSiteSlug = ({
  headerSiteSlug,
  host,
  querySiteSlug,
}: {
  headerSiteSlug?: null | string
  host?: null | string
  querySiteSlug?: null | string
}) => {
  if (querySiteSlug) {
    return querySiteSlug
  }

  if (headerSiteSlug) {
    return headerSiteSlug
  }

  return siteSlugFromHost(host) || MAIN_SITE_SLUG
}
