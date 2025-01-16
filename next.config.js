/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'livemodel.oss-cn-shenzhen.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'minio.livemodel.xyz',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    turbo: {
      rules: {
        '*.svg': ['@svgr/webpack'],
        '*.module.css': ['style-loader', 'css-loader'],
      },
      resolveAlias: {
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      },
    },
    serverComponentsExternalPackages: [
      'utf-8-validate',
      'bufferutil'
    ],
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-dom$': 'react-dom/profiling',
      'scheduler/tracing': 'scheduler/tracing-profiling',
    }
    config.ignoreWarnings = [
      { message: /Can't resolve 'coffee-script'/ }
    ]
    return config
  }
}

module.exports = nextConfig 