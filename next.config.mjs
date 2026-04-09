/** @type {import("next").NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  experimental: { optimizePackageImports: ["lucide-react"] },
  output: "standalone",
}

export default nextConfig
