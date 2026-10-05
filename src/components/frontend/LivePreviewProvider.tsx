'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useLivePreview } from '@payloadcms/live-preview-react'

const LivePreviewDataContext = createContext<unknown>(null)

/** Prefer env (stable across SSR/client); fall back to iframe origin in the browser. */
export function livePreviewServerURL(): string {
  return (
    process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  )
}

export function useDocLivePreview<T extends Record<string, any>>(initialData: T) {
  return useLivePreview({
    depth: 2,
    initialData,
    serverURL: livePreviewServerURL(),
  })
}

/**
 * One subscription shared by intro + body so SiteShell `beforeMain` and `<main>`
 * both track the same live form state.
 */
export function DocLivePreviewProvider<T extends Record<string, any>>({
  children,
  initialData,
}: {
  children: ReactNode
  initialData: T
}) {
  const { data } = useDocLivePreview(initialData)
  return (
    <LivePreviewDataContext.Provider value={data}>{children}</LivePreviewDataContext.Provider>
  )
}

export function useLivePreviewData<T>(): T {
  const data = useContext(LivePreviewDataContext)
  if (data == null) {
    throw new Error('useLivePreviewData must be used within DocLivePreviewProvider')
  }
  return data as T
}

export function useOptionalLivePreviewData<T>(): T | null {
  return useContext(LivePreviewDataContext) as T | null
}
