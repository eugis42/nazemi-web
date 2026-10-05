'use client'

import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'

import { livePreviewServerURL } from '@/components/frontend/LivePreviewProvider'

/**
 * Server-side live preview bridge (Payload-recommended for App Router).
 * Refreshes the RSC tree on document events (save / autosave / publish).
 * Use where the page is mostly Server Components (e.g. homepage blocks).
 */
export function RefreshRouteOnSave() {
  const router = useRouter()
  const serverURL = livePreviewServerURL()
  if (!serverURL) return null

  return (
    <PayloadRefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />
  )
}
