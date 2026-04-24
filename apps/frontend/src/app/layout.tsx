import type { Metadata } from "next";
import "../app/globals.css";
import { AppProviders } from "../providers/app-providers";
import { SiteFooter } from "../components/site-footer";

export const metadata: Metadata = {
  title: "LMS SaaS",
  description: "Multi-tenant LMS platform",
  icons: {
    icon: [{ url: "/favicon.webp", type: "image/webp" }],
    shortcut: [{ url: "/favicon.webp", type: "image/webp" }],
    apple: [{ url: "/favicon.webp", type: "image/webp" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="flex min-h-screen flex-col">
        <AppProviders>
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
