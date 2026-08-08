import type { Field, TextareaField, TextField } from 'payload'

import { ctaVariantOptions } from '@/fields/cta'
import {
  hrefFieldDescription,
  validateOptionalHref,
  validateRequiredHref,
} from '@/fields/validateHref'

/** Use on `title` fields — styled via `custom.scss` for a clearer document heading. */
export const adminDocumentTitleClass = 'nazemi-admin-document-title'

/**
 * Merges onto drafts `_status` via mergeBaseFields.
 * List cell = coloured Payload Pill (published green, draft amber, …).
 * Do not set `options` here — versions.drafts already injects them; duplicating
 * breaks Postgres enum create (`draft, published, draft, published`).
 */
export const draftStatusListCellField: Field = {
  name: '_status',
  type: 'select',
  // Must set explicitly — sanitize would otherwise replace i18n label with `_status`.
  label: ({ t }) => t('version:status'),
  admin: {
    components: {
      Cell: '/components/admin/StatusCell#StatusCell',
    },
  },
} as Field

/** Outline pills for hasMany taxonomy relationships in list view. */
export const tagsListCellAdmin = {
  components: {
    Cell: '/components/admin/TagsListCell#TagsListCell',
  },
} as const

/** Upload list cell: thumbnail only (hide filename). */
export const uploadPreviewListCellAdmin = {
  components: {
    Cell: '/components/admin/UploadPreviewCell#UploadPreviewCell',
  },
} as const

/** Day + time fields: Czech format in the input and „Čas“ above the time list (react-datepicker). */
export const adminDayAndTimePickerCs = {
  displayFormat: 'd. M. yyyy, HH:mm',
  overrides: {
    timeCaption: 'Čas',
  },
  pickerAppearance: 'dayAndTime' as const,
  timeFormat: 'HH:mm',
}

export const excerptField: TextareaField = {
  name: 'excerpt',
  type: 'textarea',
  admin: {
    description: 'Krátký text v přehledech a na detailu.',
    rows: 4,
  },
  label: 'Perex',
}

export const slugField = (): TextField => ({
  name: 'slug',
  type: 'text',
  admin: {
    description: 'Vygeneruje se z názvu při prvním uložení.',
    position: 'sidebar',
  },
  index: true,
  label: 'Slug',
  required: true,
})

export const siteField: Field = {
  name: 'site',
  type: 'relationship',
  admin: {
    position: 'sidebar',
  },
  label: 'Web',
  relationTo: 'sites',
  required: true,
}

/** Cross-post to main web — visible only for sub-web (custom Field). */
export const showOnMainSiteField: Field = {
  name: 'showOnMainSite',
  type: 'checkbox',
  label: 'Zobrazit i na hlavním webu',
  admin: {
    description: 'Zobrazí obsah kromě aktuálního webu i na hlavním webu NaZemi.',
    components: {
      Field: '/components/admin/ShowOnMainSiteField#ShowOnMainSiteField',
    },
  },
}

/**
 * Sidebar “Web” box: site picker + optional cross-post checkbox (sub-webs only).
 * Collapsible = visible container without nesting data paths.
 */
export const siteSidebarGroup = (siteDescription?: string): Field => ({
  type: 'collapsible',
  label: 'Web',
  admin: {
    initCollapsed: false,
    position: 'sidebar',
  },
  fields: [
    {
      ...siteField,
      admin: {
        description: siteDescription,
      },
    },
    showOnMainSiteField,
  ],
})


/** Internal CMS editor — not shown on the public site. */
export const authorField: Field = {
  name: 'author',
  type: 'relationship',
  admin: {
    description: 'Kdo vytvořil tento obsah — nezobrazuje se na webu.',
  },
  label: 'Interní editor',
  relationTo: 'users',
}

/** Public byline for news articles. */
export const authorNameField: TextField = {
  name: 'authorName',
  type: 'text',
  admin: {
    description: 'Veřejný podpis u článku. Předvyplní se z interního editora; můžete změnit.',
  },
  label: 'Autor (veřejný)',
}

export const sharingImageField: Field = {
  name: 'sharingImage',
  type: 'upload',
  admin: {
    description: 'Volitelný přepis výchozího sdílecího obrázku z nastavení webu.',
  },
  label: 'Sdílecí obrázek',
  relationTo: 'media',
}

export const seoFields = (): Field[] => [
  slugField(),
  {
    name: 'metaTitle',
    type: 'text',
    admin: {
      description: 'Volitelný přepis výchozího SEO titulku stránky.',
    },
    label: 'SEO titulek',
  },
  {
    name: 'description',
    type: 'textarea',
    admin: {
      description: 'Volitelný přepis meta popisu pro vyhledávače a sdílení.',
      rows: 4,
    },
    label: 'Popis',
  },
  sharingImageField,
  {
    name: 'canonicalURL',
    type: 'text',
    admin: {
      description: 'Volitelná kanonická URL adresa.',
    },
    label: 'Kanonická URL',
    validate: validateOptionalHref,
  },
  {
    name: 'noindex',
    type: 'checkbox',
    admin: {
      description: 'Zakáže indexaci stránky ve vyhledávačích.',
    },
    label: 'Zakázat indexaci',
  },
]

export const socialLinkField: Field = {
  name: 'socialLinks',
  type: 'array',
  admin: {
    description: 'Odkazy v patičce webu.',
    initCollapsed: true,
  },
  label: 'Sociální sítě',
  labels: {
    plural: 'Sociální sítě',
    singular: 'Sociální síť',
  },
  fields: [
    {
      name: 'network',
      type: 'text',
      label: 'Síť',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      label: 'Profil URL',
      required: true,
      admin: {
        description: hrefFieldDescription,
      },
      validate: validateRequiredHref,
    },
  ],
}

/**
 * Doc-level “Call to Action” array (`ctas`).
 * Placement: own tab **Call to Action** (Workshopy, Kalendar, Projekty, Publikace).
 * Block-level CTAs use `callToActionField` (`actions`) instead.
 */
export const ctaField = (
  description?: string,
  options?: { withVariant?: boolean },
): Field => ({
  name: 'ctas',
  type: 'array',
  admin: {
    ...(description ? { description } : {}),
    initCollapsed: true,
  },
  label: 'Call to Action',
  labels: {
    plural: 'Call to Action',
    singular: 'Call to Action',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Text tlačítka',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      label: 'URL',
      required: true,
      admin: {
        description: hrefFieldDescription,
      },
      validate: validateRequiredHref,
    },
    ...(options?.withVariant
      ? [
          {
            name: 'variant',
            type: 'select' as const,
            label: 'Varianta',
            defaultValue: 'outline',
            options: [...ctaVariantOptions],
          },
        ]
      : []),
  ],
})

/** Meta tab admin.description — withAuthor collections include Interní editor. */
export function metaTabDescription(withAuthor: boolean) {
  return withAuthor ? 'SEO a interní nastavení.' : 'Slug a SEO.'
}
