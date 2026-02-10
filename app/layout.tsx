import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Certificate Registry",
  description: "Správa a monitoring certifikátov s automatickými email notifikáciami",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body>
        {children}
      </body>
    </html>
  );
}
