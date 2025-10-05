/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true, // Disable image optimization to prevent routing issues
    domains: [],
    remotePatterns: [],
  },
}

module.exports = nextConfig