import type { Metadata, Viewport } from 'next'
import React from 'react'

import './styles.css'

import { buildPageMetadata } from '@/lib/metadata'
import { resolveSiteFromCurrentRequest } from '@/lib/frontend'

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveSiteFromCurrentRequest()
  return buildPageMetadata({ site })
}

export async function generateViewport(): Promise<Viewport> {
  const site = await resolveSiteFromCurrentRequest()
  return {
    themeColor: site.primaryColor || undefined,
  }
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  )
}
