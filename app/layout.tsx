import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: "CertReg IS OS SR",
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
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
