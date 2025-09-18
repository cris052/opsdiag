import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/',
        destination: '/chat',
        permanent: true, // This will redirect the root path to the chat page
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ]
  },
  // 开发模式下禁用静态导出以支持热更新
  ...(process.env.NODE_ENV === 'production' ? {
    output: 'export',  
    trailingSlash: true,       
    distDir: 'out',
  } : {}),
  images: {
    unoptimized: true, // 关闭优化，直接输出原图
  },
  // 禁用页面缓存配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },    
  turbopack: {
    rules: {
      '*.less': {
        loaders: ['less-loader', 'css-loader'],
        as: '*.js',
      },
    },
  }, 
};

export default nextConfig;
