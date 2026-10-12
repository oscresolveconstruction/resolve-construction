
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { redirect } from "next/navigation";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { getSessionUserId } from "./lib/auth";
import { db } from "../src/prisma/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resolve Construction | Management Portal",
  description: "Private management portal for Resolve Construction Ltd",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionUserId();

  const user = userId
    ? await db.orm.public.AppUser.first({ id: userId })
    : null;

  const isAuthenticated = Boolean(user?.isActive);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        {isAuthenticated ? (
          <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        ) : (
          <div className="min-h-screen bg-gray-100">
            {children}
          </div>
        )}
      </body>
    </html>
  );
}
