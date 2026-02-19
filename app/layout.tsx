import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script"; // ✅ TAMBAHKAN INI
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RedFeng Travel",
  description: "RedFeng Digital Travel Ecosystem",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* ✅ MIDTRANS SNAP PRODUCTION */}
        <Script
          src="https://app.midtrans.com/snap/snap.js"
          data-client-key="Mid-client-uJ9l52mk30qh9_ts"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
