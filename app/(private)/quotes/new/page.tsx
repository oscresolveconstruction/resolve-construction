import { db } from "../../../../src/prisma/db";
import QuoteDraftForm from "./QuoteDraftForm";
export const dynamic = "force-dynamic";
export default async function NewQuotePage() {
  const [customers, projects] = await Promise.all([
    db.orm.public.Customer.all(),
    db.orm.public.Project.all(),
  ]);
  return (
    <main className="min-h-screen bg-gray-50 p-5 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">New Estimate</h1>
        <p className="mt-2 text-gray-600">Prepare a draft using a real customer, with optional project and detailed line items.</p>
        <QuoteDraftForm
          customers={customers.map(c => ({ id:c.id, name:c.name }))}
          projects={projects.map(p => ({ id:p.id, name:p.name, customerId:p.customerId }))}
        />
      </div>
    </main>
  );
}
