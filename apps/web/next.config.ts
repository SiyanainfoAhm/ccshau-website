import type { NextConfig } from "next";
import { resolve } from "path";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  // Monorepo root — required so Vercel/Next file tracing resolves workspace deps.
  outputFileTracingRoot: resolve(__dirname, "../.."),
  // Circulars, tenders, downloads, etc. upload PDFs via Server Actions (default limit is 1 MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "26mb",
    },
    // Middleware/proxy buffers multipart bodies before Server Actions; default is 10 MB.
    proxyClientMaxBodySize: "26mb",
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
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
  async headers() {
    const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : "";

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
      `connect-src 'self' https://www.google.com https://www.gstatic.com${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
      "frame-src https://www.google.com https://www.gstatic.com",
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
