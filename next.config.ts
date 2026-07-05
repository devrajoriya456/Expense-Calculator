// Derive the production host from env so server actions / origins aren't
// hardcoded to localhost. Falls back to localhost for local dev.
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

let allowedOrigin = 'localhost:3000'
try {
  allowedOrigin = new URL(appUrl).host
} catch {
  // keep default
}

const config = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [allowedOrigin, 'localhost:3000'],
    },
  },
}

export default config
