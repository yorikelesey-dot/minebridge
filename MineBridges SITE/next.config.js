/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.modrinth.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.forgecdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'edge.forgecdn.net',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
