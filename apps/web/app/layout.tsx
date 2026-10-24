import type { Metadata } from "next";
import { JetBrains_Mono, DotGothic16 } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dotGothic = DotGothic16({
  subsets: ["latin"],
  variable: "--font-bubbledot",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rehearse · AI Mock Interview Platform",
    template: "%s · Rehearse",
  },
  description: "Practice the interview you'll actually get. Powered by AI voice, live code compiler, and structured scoring.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Rehearse · AI Mock Interview Platform",
    description: "Practice the interview you'll actually get.",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Rehearse" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} ${dotGothic.variable} ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
