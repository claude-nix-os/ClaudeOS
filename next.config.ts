import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['ws'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    // Allow importing from modules/ and node_modules/@claude-nix-os/
    config.resolve.symlinks = true
    return config
  },
}

export default nextConfig
