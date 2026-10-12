
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const linkClass =
    "block w-full rounded-lg px-4 py-3 text-left text-gray-800 transition-colors hover:bg-orange-50 hover:text-orange-600";

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      alert("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* BRAND */}

      <div className="border-b border-gray-100 p-6">
        <h1 className="text-xl font-bold tracking-wide text-gray-900">
          RESOLVE
          <span className="text-orange-600">.</span>
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Construction
        </p>

        <p className="mt-3 text-xs font-medium text-orange-600">
          Management Portal
        </p>
      </div>

      {/* MAIN MENU */}

      <nav className="flex-1 px-4 py-6">
        <p className="mb-3 px-4 text-xs font-semibold tracking-wider text-gray-400">
          MENU
        </p>

        <div className="space-y-1">
          <Link href="/" className={linkClass}>
            Dashboard
          </Link>

          <Link href="/projects" className={linkClass}>
            Projects
          </Link>

          <Link href="/customers" className={linkClass}>
            Customers
          </Link>

          <Link href="/workers" className={linkClass}>
            Workers
          </Link>

          <Link href="/labour" className={linkClass}>
            Daily Labour
          </Link>

          <Link href="/expenses" className={linkClass}>
            All Expenses & Receipts
          </Link>

          <Link href="/general-expenses" className={linkClass}>
            General Expenses
          </Link>

          <Link href="/company-finances" className={linkClass}>
            Company Finances
          </Link>
        </div>

        <p className="mb-3 mt-8 px-4 text-xs font-semibold tracking-wider text-gray-400">
          COMING SOON
        </p>

        <div className="space-y-1">
          <span className="block px-4 py-3 text-gray-400">
            Quotes
          </span>

          <span className="block px-4 py-3 text-gray-400">
            Invoices
          </span>
        </div>
      </nav>

      {/* ACCOUNT */}

      <div className="border-t border-gray-200 p-4">
        <div className="mb-3 rounded-lg bg-orange-50 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">
            Owner Account
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Full Access
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full rounded-lg border border-red-200 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          {loggingOut ? "Signing out..." : "↪ Log Out"}
        </button>
      </div>
    </aside>
  );
}
