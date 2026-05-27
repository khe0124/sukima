import type { Metadata } from "next";
import { Cormorant, Inter } from "next/font/google";

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
  title: "Sukima Photo Archive",
  description: "A private-first personal photo archive."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${cormorant.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
