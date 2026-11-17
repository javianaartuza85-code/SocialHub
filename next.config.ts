import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El generador de PDF funciona mejor sin empaquetar
  serverExternalPackages: ["@react-pdf/renderer"],
  // Encabezados de seguridad básicos
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
