import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Upstash Lock Demo",
  description:
    "A distributed lock demo built with @upstash/lock and Upstash Redis.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${plexMono.variable} ${inter.variable} bg-stone-50 font-sans text-stone-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
