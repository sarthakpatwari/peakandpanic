import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
  fallback: ["system-ui", "Arial"],
});

export const metadata: Metadata = {
  title: "Peak and Panic",
  description: "Global economics, Indian markets and fundamental research.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>{children}</body>
    </html>
  );
}
