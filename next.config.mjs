/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许公网 IP 访问开发服务器的热更新资源
  experimental: {
    allowedDevOrigins: ['117.72.96.233'],
  },
  async rewrites() {
    return [
      {
        // 匹配所有以 /api/ 开头的请求
        source: '/api/:path*',
        // 转发到后端服务器，并去掉 /api 前缀
        // 例如：请求 /api/login -> 转发到 http://117.72.96.233:8000/login
        destination: 'http://117.72.96.233:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
