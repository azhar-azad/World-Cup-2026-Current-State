import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 — Live",
  description: "Live group standings, fixtures and knockout bracket",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
