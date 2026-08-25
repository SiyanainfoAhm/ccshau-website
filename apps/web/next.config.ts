import type { NextConfig } from "next";
import { resolve } from "path";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

function azureBlobHostname(): string | null {
  const base = process.env.NEXT_PUBLIC_AZURE_STORAGE_BASE_URL?.trim();
  if (base) {
    try {
      return new URL(base).hostname;
    } catch {
      return null;
    }
  }
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() ||
    process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  return account ? `${account}.blob.core.windows.net` : null;
}

const azureHostname = azureBlobHostname();

const nextConfig: NextConfig = {
  // Monorepo root — required so Vercel/Next file tracing resolves workspace deps.
  outputFileTracingRoot: resolve(__dirname, "../.."),
  // Circulars, tenders, downloads, etc. upload PDFs via Server Actions (default limit is 1 MB).
  experimental: {
    serverActions: {
      // Media-centre album videos allow up to 100 MB (images/docs stay well under this).
      bodySizeLimit: "105mb",
    },
    // Middleware/proxy buffers multipart bodies before Server Actions; default is 10 MB.
    proxyClientMaxBodySize: "105mb",
  },
  async rewrites() {
    return [
      // Same-origin PDF proxy so browsers can embed Azure docs in iframes.
      {
        source: "/documents/college-wise-degree-programmes.pdf",
        destination:
          "https://ccshau.blob.core.windows.net/ccshaucontainer/pages-pdf/1697605726.pdf",
      },
    ];
  },
  async redirects() {
    return [
      { source: "/index.aspx", destination: "/", permanent: true },
      { source: "/Default.aspx", destination: "/", permanent: true },
      { source: "/NoticeBoard.aspx", destination: "/news", permanent: true },
      { source: "/Tender.aspx", destination: "/tenders", permanent: true },
      { source: "/Circular.aspx", destination: "/circulars", permanent: true },
      { source: "/Contact.aspx", destination: "/contact", permanent: true },
      {
        source: "/contact-us/:slug",
        destination: "/college/contact-us/:slug",
        permanent: true,
      },
      {
        source: "/college/contact-us/:slug/",
        destination: "/college/contact-us/:slug",
        permanent: true,
      },
      {
        source: "/college/hrm",
        destination: "/pages/human-resource-management",
        permanent: false,
      },
      {
        source: "/college/eo-cum-se",
        destination: "/pages/estate-office",
        permanent: false,
      },
      {
        source: "/awards",
        destination: "/pages/awards",
        permanent: false,
      },
      {
        source: "/college/dsw",
        destination: "/college/directorate-of-students-welfare",
        permanent: false,
      },
      {
        source: "/college/dsw/:path*",
        destination: "/college/directorate-of-students-welfare/:path*",
        permanent: false,
      },
      {
        source: "/college/contact-us/dsw",
        destination: "/college/contact-us/directorate-of-students-welfare",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "hau.ac.in",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.hau.ac.in",
        pathname: "/**",
      },
      // Azure Blob Storage (any account *.blob.core.windows.net)
      {
        protocol: "https",
        hostname: "*.blob.core.windows.net",
        pathname: "/**",
      },
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      ...(azureHostname
        ? [
            {
              protocol: "https" as const,
              hostname: azureHostname,
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
  async headers() {
    const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : "";
    const azureOrigin = azureHostname
      ? `https://${azureHostname}`
      : "https://*.blob.core.windows.net";

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Next.js + reCAPTCHA require inline/eval in practice for widgets and hydration.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
      `connect-src 'self' https://www.google.com https://www.gstatic.com${supabaseOrigin ? ` ${supabaseOrigin}` : ""} https://*.blob.core.windows.net${azureOrigin && !azureOrigin.includes("*") ? ` ${azureOrigin}` : ""}`,
      // CMS sidebar/page HTML may embed https iframes (maps, docs, library portals, etc.).
      "frame-src 'self' https:",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
