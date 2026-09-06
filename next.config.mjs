/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer and @aws-sdk pull in some Node-only bits that don't
  // need to go through the client bundler — keeping them server-external
  // avoids dragging fs/stream polyfills into the edge/client graph.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  images: {
    // Client logos / catalog photos / uploaded assets are served from
    // wherever STORAGE_DRIVER points (Supabase Storage or S3); loosened
    // here rather than enumerating every tenant's bucket host.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
  },
};

export default nextConfig;
