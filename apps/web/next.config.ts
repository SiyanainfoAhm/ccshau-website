import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/index.aspx", destination: "/", permanent: true },
      { source: "/Default.aspx", destination: "/", permanent: true },
      { source: "/NoticeBoard.aspx", destination: "/news", permanent: true },
      { source: "/Tender.aspx", destination: "/tenders", permanent: true },
      { source: "/Circular.aspx", destination: "/circulars", permanent: true },
      { source: "/Contact.aspx", destination: "/contact", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
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
