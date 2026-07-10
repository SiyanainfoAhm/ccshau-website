import type { NextConfig } from "next";
import { resolve } from "path";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname),
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
};

export default nextConfig;
