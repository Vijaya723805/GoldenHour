/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@supabase/supabase-js"],
  },
  images: {
    domains: ["localhost"],
  },
};

export default nextConfig;
