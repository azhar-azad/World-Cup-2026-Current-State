/** @type {import('next').NextConfig} */
const nextConfig = {
  // The workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: ["@wc26/core", "@wc26/data"],
};

export default nextConfig;
