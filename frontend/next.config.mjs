/** @type {import('next').NextConfig} */
const distDir = process.env.NEXT_DIST_DIR ?? "next-build";

const nextConfig = {
  output: "standalone",
  distDir,
};

export default nextConfig;
