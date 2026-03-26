/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/assets/iuhcm-logo.png',
      },
    ];
  },
};

module.exports = nextConfig;
