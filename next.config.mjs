/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许公网 IP 访问开发服务器资源 (Webpack HMR)
  // 注意：不要放在 experimental 下
  allowedDevOrigins: ['117.72.96.233', '117.72.96.233:3000'],

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // 使用 127.0.0.1 转发到本机后端，避免公网 IP 绕路或被拦截
        destination: 'http://127.0.0.1:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
