import type { Metadata } from "next";
import { AuthProvider } from '@/contexts/AuthContext'
import '@/utils/clean-and-reset' // Load clean and reset utilities
import '@/utils/check-storage-mode' // Load storage mode checker
import './globals.css'

export const metadata: Metadata = {
  title: "ShramSathi - Your Work Companion",
  description: "Digital platform for daily wage workers and contractors in India",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
