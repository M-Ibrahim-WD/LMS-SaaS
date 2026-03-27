import type { Metadata } from "next";
import "../app/globals.css";
import { AppProviders } from "../providers/app-providers";

export const metadata: Metadata = {
  title: "LMS SaaS",
  description: "Multi-tenant LMS platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

