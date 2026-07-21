import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // pdf-parse (and its transitive pdfjs-dist) loads a worker file via a
  // package-relative path. Bundling them into the server chunk breaks that
  // resolution ("Cannot find module '.next/…/pdf.worker.mjs'"). Externalizing
  // both lets Node resolve them from node_modules at runtime, worker path
  // intact.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
};

export default nextConfig;
