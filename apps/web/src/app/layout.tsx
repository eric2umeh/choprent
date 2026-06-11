import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ChopRent",
    template: "%s · ChopRent",
  },
  description:
    "Rent collection and plaza management for Nigerian landlords, managers, and tenants.",
  applicationName: "ChopRent",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full bg-white`}>
      <body className="min-h-full bg-white text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
