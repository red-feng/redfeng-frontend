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
  icons: {
    icon: "/logo-redfeng.png",
    shortcut: "/logo-redfeng.png",
    apple: "/logo-redfeng.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <html lang="id">
    <body
      className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 min-h-screen`}
    >
      {children}

      <Script
        src="https://app.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
    </body>
  </html>
);
}
