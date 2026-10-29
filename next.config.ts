
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: { "/api/documents/*/pdf": ["./assets/fonts/**", "./assets/branding/**"] },
  experimental: {
    serverActions: {
      bodySizeLimit: "210mb",
    },
  },
};

export default nextConfig;
