/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // /api/dataset đọc file bằng đường dẫn động (fs.readFileSync), nên Next.js không tự
    // trace được. Khai báo tường minh để Vercel đóng gói bản dữ liệu nhẹ web/data vào function.
    outputFileTracingIncludes: {
      '/api/dataset': ['./data/**/*'],
    },
  },
};

export default nextConfig;
