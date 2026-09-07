/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deliberately NOT `output: "standalone"` (or `"export"`, which would
  // break SSR/middleware/Server Actions entirely). @netlify/plugin-nextjs
  // (see netlify.toml) adapts the *standard* `.next` build output itself —
  // it traces and bundles server routes into Netlify Functions/Edge
  // Functions on its own, the same way Vercel's own adapter does. Forcing
  // standalone mode duplicates/conflicts with that tracing step rather
  // than helping it; the plugin explicitly expects a default Next.js build.

  // @react-pdf/renderer and @aws-sdk pull in some Node-only bits that don't
  // need to go through the client bundler — keeping them server-external
  // avoids dragging fs/stream polyfills into the edge/client graph. Also
  // keeps them out of the Netlify Functions bundle Next Runtime traces per
  // route, rather than duplicated into every function that imports them.
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
