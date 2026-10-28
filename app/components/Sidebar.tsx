
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [loggingOut, setLoggingOut] = useState(false);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath === pathname;
  const setMenuOpen = (open: boolean) => setOpenPath(open ? pathname : null);

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

      setMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      alert("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* MOBILE HEADER */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <span className="text-lg font-bold tracking-wide text-gray-900">
          RESOLVE<span className="text-orange-600">.</span>
        </span>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          className="rounded-lg border border-gray-200 p-2 text-gray-900"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r border-gray-200 bg-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:shrink-0 md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* BRAND */}
        <div className="flex items-start justify-between border-b border-gray-100 p-6">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-gray-900">
              RESOLVE<span className="text-orange-600">.</span>
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Construction
            </p>

            <p className="mt-3 text-xs font-medium text-orange-600">
              Management Portal
            </p>
          </div>

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-1 text-2xl text-gray-500 md:hidden"
          >
            ×
          </button>
        </div>

        {/* MAIN MENU */}
        <nav className="flex-1 px-4 py-6">
          <p className="mb-3 px-4 text-xs font-semibold tracking-wider text-gray-400">
            MENU
          </p>

          <div className="space-y-1">
            <Link
              href="/"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>

            <Link
              href="/projects"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              Projects
            </Link>

            <Link
              href="/customers"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              Customers
            </Link>

            <Link
              href="/workers"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              Workers
            </Link>

            <Link
              href="/labour"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              Daily Labour
            </Link>

            {/* NEW MONTHLY PAYROLL */}
            <Link
              href="/monthly-payroll"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              Monthly Payroll
            </Link>

            <Link
              href="/expenses"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              All Expenses & Receipts
            </Link>

            <Link
              href="/general-expenses"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              General Expenses
            </Link>

            <Link
              href="/company-finances"
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              Company Finances
            </Link>
          </div>

          <p className="mb-3 mt-8 px-4 text-xs font-semibold tracking-wider text-gray-400">
            COMING SOON
          </p>

          <div className="space-y-1">
            <Link href="/invoices" className={linkClass}>Invoices</Link>
          <Link href="/quotes" className={linkClass} onClick={() => setMenuOpen(false)}>
              Quotes & Extra Works
            </Link>

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
            {loggingOut ? "Signing out..." : "Log Out"}
          </button>
        </div>
      </aside>
    </>
  );
}
