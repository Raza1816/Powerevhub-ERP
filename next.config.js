/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/erp',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'standalone',
}

module.exports = nextConfig
