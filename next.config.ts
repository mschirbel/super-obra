import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'luldlaklrgdjgeytergw.supabase.co' },
    ],
  },
}

export default nextConfig
