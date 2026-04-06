import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import ServiceWorkerRegistrar from "@/app/components/ServiceWorkerRegistrar";
import { getOptionalEnv } from "@/lib/env";
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
  metadataBase: new URL("https://app.redfeng.co"),
  title: "Red Feng",
  description: "The Digital Travel Ecosystem",
  alternates: {
    canonical: "/",
  },
  applicationName: "Red Feng",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Red Feng",
  },
  icons: {
    icon: "/redfeng-favicon.png",
    shortcut: "/redfeng-favicon.png",
    apple: "/redfeng-favicon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const midtransClientKey = getOptionalEnv("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY");

  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_26%,#f5f7fb_100%)] antialiased`}
      >
        <ServiceWorkerRegistrar />
        {children}

        {midtransClientKey && (
          <Script
            src="https://app.midtrans.com/snap/snap.js"
            data-client-key={midtransClientKey}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
