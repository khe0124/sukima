import type { Metadata } from "next";
import { Cormorant, Inter } from "next/font/google";

import {
  getDefaultSeoDescription,
  getSeoTitle,
  getSiteName,
  getSiteUrl
} from "@/lib/seo";

import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const cormorant = Cormorant({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-cormorant"
});

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: getSiteName(),
  title: {
    default: getSiteTitle(),
    template: `%s | ${getSiteName()}`
  },
  description: getDefaultSeoDescription(),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: getSiteName(),
    title: getSeoTitle(),
    description: getDefaultSeoDescription(),
    locale: "ko_KR"
  },
  twitter: {
    card: "summary_large_image",
    title: getSeoTitle(),
    description: getDefaultSeoDescription()
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

function getSiteTitle() {
  return getSiteName();
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${cormorant.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
