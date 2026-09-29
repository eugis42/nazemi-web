import { describe, expect, it } from 'vitest'

import { workshopHasScheduledTerms } from '@/components/frontend/details'

describe('workshopHasScheduledTerms', () => {
  it('false when join missing or empty', () => {
    expect(workshopHasScheduledTerms({})).toBe(false)
    expect(workshopHasScheduledTerms({ scheduledWorkshops: { docs: [] } })).toBe(false)
    expect(workshopHasScheduledTerms({ scheduledWorkshops: { docs: [], totalDocs: 0 } })).toBe(
      false,
    )
  })

  it('true when totalDocs or docs present', () => {
    expect(workshopHasScheduledTerms({ scheduledWorkshops: { totalDocs: 2, docs: [] } })).toBe(
      true,
    )
    expect(workshopHasScheduledTerms({ scheduledWorkshops: { docs: [1] } })).toBe(true)
  })
})
