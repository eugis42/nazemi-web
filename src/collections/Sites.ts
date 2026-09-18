import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { sitesAccess } from '@/access/roles'
import { additionalColorField } from '@/fields/additionalColor'
import { mainMenuArrayAdmin, menuArrayAdmin, menuItemFields } from '@/fields/menu'
import { draftStatusListCellField, imageUploadFilter, socialLinkField } from '@/fields/shared'
import {
  hrefFieldDescription,
  validateDonateHref,
  validateOptionalHref,
  validateRequiredHref,
} from '@/fields/validateHref'
import { normaliseSiteSlug } from '@/hooks/content-hooks'
import { ADMIN_NAV_ADMINISTRATION } from '@/lib/admin-nav-groups'
import { DEFAULT_ADDITIONAL_COLORS } from '@/lib/site-colors'
import { ensureCollectionHomesForSite } from '@/lib/collection-homes'
import { MAIN_SITE_SLUG } from '@/lib/site-context'

/**
 * At most one `siteType: main` (unique slug `nazemi`).
 * Other mains → draft subsite (content kept, public gone).
 */
const ensureSingleMainSite: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const nextData = { ...(data || {}) }
  const siteType = nextData.siteType ?? originalDoc?.siteType

  if (siteType !== 'main') {
    return nextData
  }

  nextData.siteType = 'main'
  nextData.slug = MAIN_SITE_SLUG
  nextData.subdomain = null

  const currentId = originalDoc?.id
  const others = await req.payload.find({
    collection: 'sites',
    depth: 0,
    draft: true,
    limit: 50,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { siteType: { equals: 'main' } },
        ...(currentId
          ? [
              {
                id: {
                  not_equals: currentId,
                },
              },
            ]
          : []),
      ],
    },
  })

  for (const doc of others.docs) {
    const demotedSlug =
      typeof doc.slug === 'string' && doc.slug !== MAIN_SITE_SLUG
        ? doc.slug
        : `former-main-${doc.id}`

    // Write main table (no draft:true) so public `_status` actually flips.
    await req.payload.update({
      id: doc.id,
      collection: 'sites',
      context: { skipMainSiteGuard: true },
      data: {
        _status: 'draft',
        siteType: 'subsite',
        slug: demotedSlug,
      },
      overrideAccess: true,
      req,
    })
  }

  return nextData
}

export const Sites: CollectionConfig = {
  slug: 'sites',
  access: sitesAccess,
  admin: {
    defaultColumns: ['name', 'slug', 'siteType', '_status'],
    group: ADMIN_NAV_ADMINISTRATION,
    listSearchableFields: ['name', 'slug'],
    useAsTitle: 'name',
    components: {
      edit: {
        beforeDocumentControls: ['/components/admin/SitesEditTabFocus#SitesEditTabFocus'],
      },
    },
  },
  // `main` sorts before `subsite` alphabetically → main web always first.
  defaultSort: ['siteType', 'name'],
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Obecné',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Název webu',
              required: true,
            },
            {
              name: 'slug',
              type: 'text',
              hooks: {
                beforeChange: [normaliseSiteSlug],
              },
              label: 'Slug webu',
              required: true,
              unique: true,
            },
            {
              name: 'siteType',
              type: 'radio',
              defaultValue: 'subsite',
              label: 'Typ webu',
              options: [
                {
                  label: 'Hlavní web',
                  value: 'main',
                },
                {
                  label: 'Sub web',
                  value: 'subsite',
                },
              ],
              required: true,
            },
            {
              name: 'subdomain',
              type: 'text',
              admin: {
                condition: (_, siblingData) => siblingData.siteType === 'subsite',
                description: 'Produkční host; lokálně stačí ?site=slug.',
              },
              label: 'Subdoména',
            },
          ],
        },
        {
          label: 'Branding',
          fields: [
            {
              name: 'logo',
              type: 'upload',
              label: 'Logo',
              relationTo: 'media',
              filterOptions: imageUploadFilter,
            },
            {
              name: 'logoNavbarPadding',
              type: 'number',
              label: 'Odsazení loga v navigaci',
              defaultValue: 0,
              min: 0,
              max: 32,
              admin: {
                description:
                  'Stejné odsazení ze všech stran uvnitř loga v navigaci (px). 0 = žádné.',
              },
            },
            {
              name: 'favicon',
              type: 'group',
              label: 'Favicon',
              admin: {
                description:
                  'Ikona v záložce prohlížeče a na ploše iOS. SVG + Apple Touch PNG 180×180 (čtverec, sky pozadí, značka beze změny tvaru).',
              },
              fields: [
                {
                  name: 'icon',
                  type: 'upload',
                  label: 'Favicon (SVG)',
                  relationTo: 'media',
                  filterOptions: imageUploadFilter,
                  admin: {
                    description:
                      'Primární ikona — SVG se sky pozadím. Propojí se do <head> jako rel="icon".',
                  },
                },
                {
                  name: 'appleTouchIcon',
                  type: 'upload',
                  label: 'Apple Touch Icon',
                  relationTo: 'media',
                  filterOptions: imageUploadFilter,
                  admin: {
                    description:
                      'PNG 180×180 (sky pozadí) pro iOS. Propojí se jako rel="apple-touch-icon".',
                  },
                },
              ],
            },
            {
              name: 'homepageBackground',
              type: 'upload',
              label: 'Pozadí homepage',
              relationTo: 'media',
              filterOptions: imageUploadFilter,
              admin: {
                description:
                  'Ilustrace / obrázek za hero blokem na domovské stránce. Bez výběru se použije výchozí vlna.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'primaryColor',
                  type: 'text',
                  label: 'Primární barva',
                  admin: {
                    description:
                      'Texty, rámečky a navigace — na hlavním webu barva „ground“ (earth). CSS hex, např. #7C3AED.',
                    width: '34%',
                  },
                },
                {
                  name: 'primaryBackgroundColor',
                  type: 'text',
                  label: 'Primární barva pozadí',
                  admin: {
                    description:
                      'Pozadí stránek a světlé plochy — na hlavním webu barva „sky“.',
                    width: '33%',
                  },
                },
                {
                  name: 'accentColor',
                  type: 'text',
                  label: 'Akcentová barva',
                  admin: {
                    description:
                      'Call to Action tlačítka (filled green / přihlášení) — na hlavním webu zelená.',
                    width: '33%',
                  },
                },
              ],
            },
            {
              name: 'additionalColors',
              type: 'array',
              label: 'Doplňkové barvy',
              labels: {
                plural: 'Doplňkové barvy',
                singular: 'Doplňková barva',
              },
              defaultValue: [...DEFAULT_ADDITIONAL_COLORS],
              admin: {
                components: {
                  RowLabel: '/components/admin/AdditionalColorRowLabel#AdditionalColorRowLabel',
                },
                description:
                  'Předvyplněná paleta — lze upravit, přidat nebo smazat. Používá se u barevných výběrů v obsahu.',
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  label: 'Název',
                },
                {
                  name: 'value',
                  type: 'text',
                  label: 'Hodnota',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          label: 'Navigace',
          fields: [
            {
              name: 'mainMenu',
              type: 'array',
              admin: {
                ...mainMenuArrayAdmin,
              },
              label: 'Hlavní menu',
              labels: {
                plural: 'Položky',
                singular: 'položku',
              },
              fields: menuItemFields({ withDepth: true }),
            },
            {
              name: 'secondaryMenu',
              type: 'array',
              admin: {
                description: 'Vedlejší odkazy (např. externí weby). Jedna úroveň, bez podpoložek.',
                ...menuArrayAdmin,
              },
              label: 'Vedlejší menu',
              labels: {
                plural: 'Položky',
                singular: 'položku',
              },
              fields: menuItemFields(),
            },
          ],
        },
        {
          label: 'Kontakt',
          fields: [
            socialLinkField,
            {
              name: 'contactDetails',
              type: 'array',
              label: 'Kontaktní bloky',
              labels: {
                plural: 'Kontaktní bloky',
                singular: 'Kontaktní blok',
              },
              admin: {
                components: {
                  RowLabel: '/components/admin/ArrayFieldRowLabel#ArrayFieldRowLabel',
                },
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Nadpis',
                  required: true,
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'email',
                      type: 'email',
                      label: 'E-mail',
                      admin: { width: '55%' },
                    },
                    {
                      name: 'phone',
                      type: 'text',
                      label: 'Telefon',
                      admin: { width: '45%' },
                    },
                  ],
                },
                {
                  name: 'addressLines',
                  type: 'array',
                  label: 'Adresa (řádky)',
                  labels: {
                    plural: 'Řádky',
                    singular: 'Řádek',
                  },
                  admin: {
                    initCollapsed: true,
                  },
                  fields: [
                    {
                      name: 'line',
                      type: 'text',
                      label: 'Řádek',
                      required: true,
                    },
                  ],
                },
                {
                  name: 'note',
                  type: 'textarea',
                  label: 'Poznámka (např. IČO)',
                },
                {
                  name: 'links',
                  type: 'array',
                  label: 'Odkazy',
                  labels: {
                    plural: 'Odkazy',
                    singular: 'Odkaz',
                  },
                  admin: {
                    components: {
                      RowLabel: '/components/admin/ArrayFieldRowLabel#ArrayFieldRowLabel',
                    },
                    initCollapsed: true,
                  },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'label',
                          type: 'text',
                          label: 'Text',
                          required: true,
                          admin: { width: '40%' },
                        },
                        {
                          name: 'href',
                          type: 'text',
                          label: 'URL',
                          required: true,
                          admin: {
                            description: hrefFieldDescription,
                            width: '60%',
                          },
                          validate: validateRequiredHref,
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'extras',
                  type: 'array',
                  label: 'Další údaje',
                  labels: {
                    plural: 'Údaje',
                    singular: 'Údaj',
                  },
                  admin: {
                    initCollapsed: true,
                  },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'label',
                          type: 'text',
                          label: 'Popisek',
                          required: true,
                          admin: { width: '40%' },
                        },
                        {
                          name: 'value',
                          type: 'text',
                          label: 'Hodnota',
                          required: true,
                          admin: { width: '60%' },
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'legacyPlainText',
                  type: 'text',
                  label: 'Jednoduchý text (legacy)',
                  admin: {
                    description: 'Zpětná kompatibilita — preferujte e-mail, telefon a řádky adresy.',
                  },
                },
              ],
            },
            {
              name: 'fullAddress',
              type: 'richText',
              label: 'Plná adresa',
            },
            {
              name: 'additionalContent',
              type: 'richText',
              label: 'Doplňující obsah',
            },
          ],
        },
        {
          label: 'Patička',
          fields: [
            {
              name: 'donateCta',
              type: 'group',
              label: 'Hlavní call to action patičky',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Nadpis',
                },
                {
                  name: 'body',
                  type: 'textarea',
                  label: 'Text',
                },
                additionalColorField({
                  allowNone: true,
                  defaultValue: '#bda9ff',
                  label: 'Barva pozadí',
                  name: 'backgroundColor',
                }),
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'buttonLabel',
                      type: 'text',
                      label: 'Text tlačítka',
                      admin: { width: '40%' },
                    },
                    {
                      name: 'href',
                      type: 'text',
                      label: 'URL tlačítka',
                      admin: {
                        description: hrefFieldDescription,
                        width: '60%',
                      },
                      validate: validateDonateHref,
                    },
                  ],
                },
              ],
            },
            {
              name: 'newsletters',
              type: 'array',
              label: 'Newslettery',
              labels: {
                plural: 'Newslettery',
                singular: 'Newsletter',
              },
              admin: {
                components: {
                  RowLabel: '/components/admin/ArrayFieldRowLabel#ArrayFieldRowLabel',
                },
                initCollapsed: true,
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Název',
                  required: true,
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: 'Popis',
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'subscribeLabel',
                      type: 'text',
                      label: 'Text tlačítka',
                      defaultValue: 'Přihlásit se',
                      admin: { width: '40%' },
                    },
                    {
                      name: 'subscribeUrl',
                      type: 'text',
                      label: 'URL přihlášení',
                      required: true,
                      admin: {
                        description: hrefFieldDescription,
                        width: '60%',
                      },
                      validate: validateRequiredHref,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Meta',
          admin: {
            description: 'Výchozí SEO pro celý web (stránky mohou přepsat).',
          },
          fields: [
            {
              name: 'metaTitle',
              type: 'text',
              label: 'SEO titulek',
              admin: {
                description: 'Výchozí titulek prohlížeče / sdílení.',
              },
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Popis',
              admin: {
                description: 'Výchozí meta popis webu.',
              },
            },
            {
              name: 'sharingImage',
              type: 'upload',
              label: 'Sdílecí obrázek',
              relationTo: 'media',
              filterOptions: imageUploadFilter,
              admin: {
                description: 'Výchozí obrázek pro sociální sítě.',
              },
            },
            {
              name: 'canonicalURL',
              type: 'text',
              label: 'Kanonická URL',
              validate: validateOptionalHref,
            },
            {
              name: 'noindex',
              type: 'checkbox',
              label: 'Zakázat indexaci',
              admin: {
                description: 'Zakáže indexaci celého webu ve vyhledávačích.',
              },
            },
          ],
        },
        {
          label: 'Funkcionalita',
          fields: [
            {
              name: 'enabledCollections',
              type: 'group',
              label: 'Povolené sekce',
              admin: {
                description: 'Vypne sekci na frontendu (menu + stránky výpisu).',
              },
              fields: [
                {
                  name: 'aktuality',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Aktuality',
                  admin: {
                    description: 'Přehled a detaily aktualit.',
                  },
                },
                {
                  name: 'kalendar',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Kalendář',
                  admin: {
                    description: 'Přehled a detaily událostí.',
                  },
                },
                {
                  name: 'projekty',
                  type: 'checkbox',
                  admin: {
                    condition: (data) => data?.siteType === 'main',
                    description: 'Projekty jsou k dispozici pouze pro hlavní web.',
                  },
                  defaultValue: true,
                  label: 'Projekty',
                },
                {
                  name: 'workshopy',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Workshopy',
                },
                {
                  name: 'publikace',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Publikace',
                },
                {
                  name: 'lide',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Lidé',
                  admin: {
                    description: 'Sekce lidí na stránce Kontakt.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    draftStatusListCellField,
  ],
  hooks: {
    beforeChange: [
      async (args) => {
        const data = { ...(args.data || {}) }
        // New sites get the shared accent palette (admin defaultValue alone is easy to clear).
        if (
          args.operation === 'create' &&
          (!Array.isArray(data.additionalColors) || data.additionalColors.length === 0)
        ) {
          data.additionalColors = [...DEFAULT_ADDITIONAL_COLORS]
        }
        if (args.context?.skipMainSiteGuard) {
          return data
        }
        return ensureSingleMainSite({ ...args, data })
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        if (doc?.id == null) return doc
        try {
          await ensureCollectionHomesForSite(req.payload, doc.id)
        } catch {
          // ponytail: menu homes best-effort; save must not fail if create races
        }
        return doc
      },
    ],
  },
  labels: {
    plural: 'Weby',
    singular: 'Web',
  },
  versions: {
    drafts: true,
  },
}
