import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSMEAS Dashboard",
  description: "Smart Sewage Monitoring and Environmental Alert System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
