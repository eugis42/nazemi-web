import { describe, expect, it, vi } from 'vitest'

import {
  kalendarSiteSwitchError,
  kalendarWorkshopFilterOptions,
  validateKalendarSiteAgainstWorkshop,
  validateKalendarWorkshopSameSite,
  workshopCrossSiteError,
  workshopSiteSwitchError,
  validateWorkshopSiteAgainstKalendar,
} from '@/lib/same-site-workshop'

describe('same-site-workshop', () => {
  it('filterOptions requires event site', () => {
    expect(kalendarWorkshopFilterOptions({ data: {} })).toBe(false)
    expect(kalendarWorkshopFilterOptions({ data: { site: 3 } })).toEqual({
      site: { equals: 3 },
    })
    expect(kalendarWorkshopFilterOptions({ data: { site: { id: 7 } } })).toEqual({
      site: { equals: 7 },
    })
  })

  it('rejects workshop from another site', async () => {
    const req = {
      payload: {
        findByID: vi.fn(async () => ({ id: 10, site: 2 })),
      },
    }
    await expect(
      validateKalendarWorkshopSameSite(10, {
        data: { site: 1 },
        req,
      } as never),
    ).resolves.toBe(workshopCrossSiteError)
  })

  it('allows workshop on same site', async () => {
    const req = {
      payload: {
        findByID: vi.fn(async () => ({ id: 10, site: { id: 1 } })),
      },
    }
    await expect(
      validateKalendarWorkshopSameSite(10, {
        data: { site: 1 },
        req,
      } as never),
    ).resolves.toBe(true)
  })

  it('blocks event site switch with foreign workshop', async () => {
    const req = {
      payload: {
        findByID: vi.fn(async () => ({ id: 10, site: 1 })),
      },
    }
    await expect(
      validateKalendarSiteAgainstWorkshop(2, {
        data: { workshop: 10 },
        req,
      } as never),
    ).resolves.toBe(kalendarSiteSwitchError)
  })

  it('allows event site switch when workshop matches', async () => {
    const req = {
      payload: {
        findByID: vi.fn(async () => ({ id: 10, site: 2 })),
      },
    }
    await expect(
      validateKalendarSiteAgainstWorkshop(2, {
        data: { workshop: 10 },
        req,
      } as never),
    ).resolves.toBe(true)
  })

  it('blocks workshop site switch when foreign events linked', async () => {
    const req = {
      payload: {
        find: vi.fn(async () => ({ docs: [{ id: 99 }] })),
      },
    }
    await expect(
      validateWorkshopSiteAgainstKalendar(2, {
        id: 10,
        req,
      } as never),
    ).resolves.toBe(workshopSiteSwitchError)
  })

  it('allows workshop site switch when no foreign events', async () => {
    const req = {
      payload: {
        find: vi.fn(async () => ({ docs: [] })),
      },
    }
    await expect(
      validateWorkshopSiteAgainstKalendar(2, {
        id: 10,
        req,
      } as never),
    ).resolves.toBe(true)
  })
})
