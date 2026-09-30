import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// NEXT_BUILD_LOWMEM=1 (default `npm run build`) — 1 compile worker. `build:fast` omits this.
const lowmem = process.env.NEXT_BUILD_LOWMEM === '1'

const nextConfig: NextConfig = {
  // Required by Dockerfile (Next standalone output).
  output: 'standalone',
  // Uploads live on disk / symlink (start-standalone.sh). Never ship media into standalone.
  outputFileTracingExcludes: {
    '*': ['./media/**/*'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  ...(lowmem
    ? {
        experimental: {
          cpus: 1,
        },
      }
    : {}),
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
