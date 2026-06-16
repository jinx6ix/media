import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JaeTravel Media Hub",
  description: "Internal image library for JaeTravel Expeditions",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d0d0d] text-[#f0e6c8] antialiased">
        {children}
      </body>
    </html>
  );
}
