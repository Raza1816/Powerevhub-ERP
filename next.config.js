/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/erp',
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/erp',
        basePath: false,
        permanent: false,
      },
      {
        source: '/api/:path*',
        destination: '/erp/api/:path*',
        basePath: false,
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
