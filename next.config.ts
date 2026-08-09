import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a self-contained server.js, so the server
  // never runs npm install or next build. public/ and .next/static are not
  // included automatically — deploy.sh copies them in.
  output: "standalone",
  serverExternalPackages: ["postgres"],
  experimental: {
    serverActions: {
      // Allow large file uploads through Server Actions (default is 1 MB).
      bodySizeLimit: "250mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
