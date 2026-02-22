import type { Metadata } from "next";
import { AuthProvider } from "@/lib/contexts/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pocket Room",
  description: "A shared space to think, remember, and build.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
