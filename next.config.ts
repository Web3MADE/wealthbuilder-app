import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.WEALTHBUILDER_NEXT_DIST_DIR ?? '.next',
  webpack: (config, { webpack }) => {
    // Coinbase's optional x402 payment modules are referenced by the wallet UI
    // bundle. WealthBuilder does not use payments, so exclude those modules.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    return config;
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
};

export default nextConfig;
