import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rehearse",
    template: "%s · Rehearse",
  },
  description: "Practice the interview you'll actually get.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Rehearse",
    description: "Practice the interview you'll actually get.",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Rehearse" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
