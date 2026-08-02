import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);
  const title = "RivalTrace — competitor changes, with receipts";
  const description =
    "Monitor the competitor pages that matter and get an evidence-backed brief when pricing, positioning, or product details change.";
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: origin,
    title: { default: title, template: "%s · RivalTrace" },
    description,
    openGraph: {
      title,
      description: "Exact before-and-after evidence for competitor pricing, product, and positioning changes.",
      type: "website",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "RivalTrace competitor change evidence card" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Exact before-and-after evidence for competitor pricing, product, and positioning changes.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
