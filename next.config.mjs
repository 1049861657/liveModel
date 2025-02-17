import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'livemodel.oss-cn-shenzhen.aliyuncs.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'minio.livemodel.xyz',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp']
  },
  experimental: {
    turbo: {
      rules: {
        '*.svg': ['@svgr/webpack'],
        '*.module.css': ['style-loader', 'css-loader'],
      },
    }
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' }
      ],
    }
  ],
  webpack: (config) => {
    // 合并所有 resolve.alias 配置
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-dom$': 'react-dom/profiling',
      'scheduler/tracing': 'scheduler/tracing-profiling',
    }
    // 合并 externals
    config.externals = [
      ...(config.externals || []),
      {
        'utf-8-validate': 'commonjs utf-8-validate',
        bufferutil: 'commonjs bufferutil',
      },
    ]
    config.ignoreWarnings = [
      { message: /Can't resolve 'coffee-script'/ }
    ]
    return config
  },
  compress: true,
}

export default withNextIntl(nextConfig); 