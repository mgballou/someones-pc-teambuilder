import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@spc/core', '@spc/dex'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'raw.githubusercontent.com', pathname: '/PokeAPI/**' },
    ],
  },
}

export default config
