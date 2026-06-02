import type { Metadata, Viewport } from "next";
import PublicPerformanceTracker from "@/app/components/PublicPerformanceTracker";
import Script from "next/script";
import AppDisplayModeBridge from "@/app/components/AppDisplayModeBridge";
import ServiceWorkerRegistrar from "@/app/components/ServiceWorkerRegistrar";
import { getOptionalEnv } from "@/lib/env";
import { getAppBaseUrl } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
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
  const displayModeBootstrap = `
    (() => {
      try {
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          window.matchMedia("(display-mode: window-controls-overlay)").matches ||
          ("standalone" in window.navigator && Boolean(window.navigator.standalone));

        document.documentElement.dataset.displayMode = isStandalone ? "standalone" : "browser";
      } catch (_error) {
        document.documentElement.dataset.displayMode = "browser";
      }
    })();
  `;

  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_26%,#f5f7fb_100%)] antialiased"
      >
        <Script id="display-mode-bootstrap" strategy="beforeInteractive">
          {displayModeBootstrap}
        </Script>
        <PublicPerformanceTracker />
        <ServiceWorkerRegistrar />
        <AppDisplayModeBridge />
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
