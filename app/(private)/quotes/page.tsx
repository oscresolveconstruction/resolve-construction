import Link from "next/link";
import { db } from "../../../src/prisma/db";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const customers = await db.orm.public.Customer.all();
  const projects = await db.orm.public.Project.all();
  return (
    <main className="min-h-screen bg-gray-50 p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-widest text-orange-600">Resolve Construction</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Quotes & Estimates</h1>
        <p className="mt-2 text-gray-600">Prepare customer estimates, then issue invoices after approval.</p>
        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Early preview: estimates on this screen are not yet saved to the database and cannot be approved or converted into invoices.
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Customers available</p><p className="mt-2 text-3xl font-bold">{customers.length}</p></div>
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Projects available</p><p className="mt-2 text-3xl font-bold">{projects.length}</p></div>
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Stored quotes</p><p className="mt-2 text-lg font-semibold text-gray-600">Coming next</p></div>
        </div>
        <div className="mt-8 rounded-xl border bg-white p-7">
          <h2 className="text-xl font-bold">Create an estimate</h2>
          <p className="mt-2 text-gray-600">Start with a draft preview using your existing customers. No customer receives a document at this stage.</p>
          <Link href="/quotes/new" className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700">New estimate →</Link>
        </div>
      </div>
    </main>
  );
}
