
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { getSessionUserId } from "./lib/auth";
import { db } from "../src/prisma/db";

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
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body>
        {isAuthenticated ? (
          <div className="flex min-h-screen min-w-0 bg-gray-100">
            <Sidebar />

            <main className="min-w-0 flex-1 pt-16 md:pt-0">
              {children}
            </main>
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
