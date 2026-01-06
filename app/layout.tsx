import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import PasswordGate from "@/components/PasswordGate";
import Navigation from "@/components/Navigation";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ηΚαλύτερηΠαρέα",
  description: "Το ψηφιακό άλμπουμ της παρέας μας",
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍷</text></svg>',
      },
    ],
    apple: [
      {
        url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍷</text></svg>',
      },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <head>
        <Script
          src={`https://upload-widget.cloudinary.com/global/all.js`}
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} antialiased bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-800 min-h-screen`}
        suppressHydrationWarning
      >
        <PasswordGate>
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </PasswordGate>
      </body>
    </html>
  );
}
