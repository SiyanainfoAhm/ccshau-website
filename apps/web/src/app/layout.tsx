import type { Metadata } from "next";
import { Playfair_Display, Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";

import { NavigationProgress } from "@/components/navigation/navigation-progress";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CCSHAU Hisar",
    template: "%s | CCSHAU Hisar",
  },
  description:
    "Chaudhary Charan Singh Haryana Agricultural University, Hisar — official website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${notoSans.variable} ${notoDevanagari.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
