/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === "1";
const distDir = process.env.NEXT_DIST_DIR ?? "next-build";

// Vercel manages the Next.js runtime and expects the default build output.
// Keep the standalone output for local/container workflows.
const nextConfig = isVercel
  ? {}
  : {
      output: "standalone",
      distDir,
    };

export default nextConfig;
