/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  trailingSlash: true,
  // Reduce development logging noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  images: {
    unoptimized: true, // Disable image optimization to prevent routing issues
    domains: [],
    remotePatterns: [],
  },
}

module.exports = nextConfig