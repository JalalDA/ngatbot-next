/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['bcrypt', 'node-telegram-bot-api'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig