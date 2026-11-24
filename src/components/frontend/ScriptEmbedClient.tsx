'use client'

import { useEffect, useRef } from 'react'

/**
 * Load one allowlisted external script into a mount node.
 * Never uses dangerouslySetInnerHTML — src already validated server-side.
 */
export function ScriptEmbedClient({
  src,
  title,
}: {
  src: string
  title: string
}) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const script = document.createElement('script')
    script.src = src
    script.async = true
    mount.appendChild(script)

    return () => {
      mount.replaceChildren()
    }
  }, [src])

  return (
    <div
      ref={mountRef}
      aria-label={title}
      className="not-prose w-full max-w-full min-h-[200px]"
      data-block="iframeEmbed"
      data-embed="script"
    />
  )
}
