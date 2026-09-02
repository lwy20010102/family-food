/** @type {import('next').NextConfig} */
// Vercel and Render both manage the Next.js runtime directly, so use the
// standard output directory for both hosts.
const backendOrigin = (
  process.env.BACKEND_PROXY_URL ?? "https://family-food-api.onrender.com"
).replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
