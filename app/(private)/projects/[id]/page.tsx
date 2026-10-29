import {projectFinancials} from '../../../lib/finance/calculations.mjs';
import Link from "next/link";

import { notFound } from "next/navigation";

import { db } from "../../../../src/prisma/db";

import DeleteProjectButton from "./DeleteProjectButton";

export const dynamic = "force-dynamic";

type ProjectPageProps = {

  params: Promise<{ id: string }>;

};

function getStatusStyle(status: string) {

  switch (status) {

    case "Active":

      return "bg-green-50 text-green-700 border-green-200";

    case "Completed":

      return "bg-blue-50 text-blue-700 border-blue-200";

    case "On Hold":

      return "bg-amber-50 text-amber-700 border-amber-200";

    default:

      return "bg-gray-50 text-gray-700 border-gray-200";

  }

}

export default async function ProjectPage({

  params,

}: ProjectPageProps) {

  const { id } = await params;

  const projectId = Number(id);

  if (!Number.isSafeInteger(projectId) || projectId <= 0) {

    notFound();

  }

  const project = await db.orm.public.Project.first({

    id: projectId,

  });

  if (!project) {

    notFound();

  }

  const [expenses, payments, labourEntries, photos, extraWorks] =

    await Promise.all([

      db.orm.public.Expense.where({ projectId }).all(),

      db.orm.public.Payment.where({ projectId }).all(),

      db.orm.public.Labour.where({ projectId }).all(),

      db.orm.public.ProjectPhoto.where({ projectId }).all(),

      db.orm.public.ExtraWork.where({ projectId }).all(),

    ]);

  const customer = project.customerId

    ? await db.orm.public.Customer.first({

        id: project.customerId,

      })

    : null;

  const money=(value:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:project.currency}).format(value);
  const summary=projectFinancials(project,{expenses,labour:labourEntries,payments,extras:extraWorks});
  const contractValue=summary.contract,approvedExtraWorks=summary.extraValue,totalProjectValue=summary.totalValue;
  const totalExpenses=summary.expenses,totalLabour=summary.labour,totalCosts=summary.cost,totalPaid=summary.received;
  const outstanding=summary.outstanding,estimatedProfit=summary.profit;
  const profitMargin=totalProjectValue>0?(estimatedProfit/totalProjectValue)*100:0;
  const missingExchangeRates=summary.missingRates;
  const managementItems = [

    {

      title: "Project Photos",

      description: "View and upload site photographs",

      href: `/projects/${projectId}/photos`,

      icon: "📸",

      detail: `${photos.length} photos`,

    },

    {

      title: "Project Expenses",

      description: "Materials, suppliers and receipts",

      href: `/projects/${projectId}/expenses`,

      icon: "🧾",

      detail: `${expenses.length} expenses`,

    },

    {

      title: "Daily Labour",

      description: "Workers, hours and labour costs",

      href: `/projects/${projectId}/labour`,

      icon: "👷",

      detail: `${labourEntries.length} entries`,

    },

    {

      title: "Payments",

      description: "Track payments received",

      href: `/projects/${projectId}/payments`,

      icon: "💷",

      detail: `${payments.length} payments`,

    },

    {

      title: "Extra Works",

      description: "Manage additional work and approvals",

      href: `/projects/${projectId}/extra-works`,

      icon: "🛠️",

      detail: `${extraWorks.length} extra works`,

    },

  ];

  const recentPhotos = [...photos]

    .sort(

      (a, b) =>

        new Date(b.createdAt).getTime() -

        new Date(a.createdAt).getTime()

    )

    .slice(0, 4);

  return (

    <main className="min-h-screen bg-gray-50 px-5 py-8 lg:px-10">

      <div className="mx-auto max-w-7xl">

        {/* BREADCRUMB */}

        <div className="mb-7 flex flex-wrap items-center gap-2 text-sm">

          <Link

            href="/projects"

            className="text-gray-500 transition hover:text-orange-600"

          >

            Projects

          </Link>

          <span className="text-gray-300">/</span>

          <span className="font-medium text-gray-900">

            {project.name}

          </span>

        </div>

        {/* HEADER */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="h-2 bg-orange-500" />

          <div className="p-6 lg:p-8">

            <div className="flex flex-wrap items-start justify-between gap-5">

              <div>

                <p className="text-xs font-bold uppercase tracking-widest text-orange-600">

                  Resolve Construction

                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">

                  {project.name}

                </h1>

                <p className="mt-2 text-gray-500">

                  {customer?.name || project.client}

                </p>

              </div>

              <span

                className={`rounded-full border px-4 py-2 text-sm font-semibold ${getStatusStyle(

                  project.status

                )}`}

              >

                {project.status}

              </span>

            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/projects/${projectId}/edit`}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-500 bg-white px-5 py-3 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
              >
                ✏️ Edit Project
              </Link>

              <Link

                href={`/projects/${projectId}/photos`}

                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"

              >

                <span>📸</span>

                Project Photos

              </Link>

              <Link

                href={`/projects/${projectId}/expenses`}

                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"

              >

                <span>🧾</span>

                Project Expenses

              </Link>

              <Link

                href={`/projects/${projectId}/payments`}

                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"

              >

                <span>💷</span>

                Payments

              </Link>

              <DeleteProjectButton
                projectId={projectId}
                projectName={project.name}
              />

            </div>

          </div>

        </section>

        {/* FINANCIAL OVERVIEW */}

        <div className="mt-9 flex flex-wrap items-end justify-between gap-3">

          <div>

            <h2 className="text-xl font-bold text-gray-900">

              Financial Overview

            </h2>

            <p className="mt-1 text-sm text-gray-500">

              Live financial summary of this project

            </p>

          </div>

          <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600">

            {project.currency} · {project.currency==='EUR'?'€':'£'}

          </span>

        </div>

        {summary.unmatchedCurrencies>0&&<p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-800">Some payments or approved extras use a different currency and are excluded from this project summary.</p>}
        {missingExchangeRates > 0 && (

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">

            <strong>Exchange rate warning:</strong>{" "}

            {missingExchangeRates} expense or labour

            entries have no valid exchange rate. Their costs

            are not included in the totals below.

          </div>

        )}

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-gray-500">

              Contract Value

            </p>

            <p className="mt-3 text-2xl font-bold text-gray-900">

              {money(contractValue)}

            </p>

            <p className="mt-3 text-xs text-gray-400">

              Original agreed project value

            </p>

          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

              <p className="text-sm font-medium text-gray-500">Approved Extra Works</p>

              <p className="mt-3 text-2xl font-bold text-orange-600">{money(approvedExtraWorks)}</p>

              <Link href={`/projects/${projectId}/extra-works`} className="mt-3 inline-block text-xs font-semibold text-orange-600 hover:underline">Manage Extra Works →</Link>

            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">

              <p className="text-sm font-medium text-orange-800">Total Project Value</p>

              <p className="mt-3 text-2xl font-bold text-gray-900">{money(totalProjectValue)}</p>

              <p className="mt-3 text-xs text-orange-700">Original contract + approved extras</p>

            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-gray-500">

              Total Costs

            </p>

            <p className="mt-3 text-2xl font-bold text-red-600">

              {missingExchangeRates?'Incomplete':money(totalCosts)}

            </p>

            <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-500">

              <div className="flex justify-between gap-2">

                <span>Expenses</span>

                <span>{money(totalExpenses)}</span>

              </div>

              <div className="flex justify-between gap-2">

                <span>Labour</span>

                <span>{money(totalLabour)}</span>

              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-gray-500">

              Payments Received

            </p>

            <p className="mt-3 text-2xl font-bold text-green-600">

              {money(totalPaid)}

            </p>

            <p className="mt-3 text-xs text-gray-400">

              Recorded client payments

            </p>

          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-gray-500">

              Outstanding

            </p>

            <p className="mt-3 text-2xl font-bold text-orange-600">

              {summary.unmatchedCurrencies?'Incomplete':money(outstanding)}

            </p>

            <p className="mt-3 text-xs text-gray-400">

              Total project value less payments

            </p>

          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">

            <p className="text-sm font-medium text-orange-800">

              Estimated Profit

            </p>

            <p

              className={`mt-3 text-2xl font-bold ${

                estimatedProfit >= 0

                  ? "text-gray-900"

                  : "text-red-600"

              }`}

            >

              {missingExchangeRates?'Incomplete':money(estimatedProfit)}

            </p>

            <p className="mt-3 text-xs font-semibold text-orange-700">

              {missingExchangeRates?'Margin incomplete':`${profitMargin.toFixed(1)}% estimated margin`}

            </p>

          </div>

        </div>

        {/* MANAGEMENT */}

        <section className="mt-10">

          <div>

            <h2 className="text-xl font-bold text-gray-900">

              Project Management

            </h2>

            <p className="mt-1 text-sm text-gray-500">

              Everything related to this construction project

            </p>

          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {managementItems.map((item) => (

              <Link

                key={item.title}

                href={item.href}

                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-orange-300 hover:shadow-md"

              >

                <div className="flex items-start justify-between">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-2xl">

                    {item.icon}

                  </div>

                  <span className="text-xl text-gray-300 transition group-hover:text-orange-600">

                    ↗

                  </span>

                </div>

                <h3 className="mt-5 text-lg font-semibold text-gray-900 transition group-hover:text-orange-600">

                  {item.title}

                </h3>

                <p className="mt-2 text-sm text-gray-500">

                  {item.description}

                </p>

                <p className="mt-4 text-xs font-semibold text-orange-600">

                  {item.detail}

                </p>

              </Link>

            ))}

            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl">

                📁

              </div>

              <h3 className="mt-5 text-lg font-semibold text-gray-900">

                Project Documents

              </h3>

              <p className="mt-2 text-sm text-gray-500">

                Store quotes, invoices and other PDF documents

                exported from Invoice Simple.

              </p>

              <p className="mt-4 text-xs font-semibold text-gray-400">

                Coming soon

              </p>

            </div>

          </div>

        </section>

        {/* RECENT PHOTOS */}

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <h2 className="text-xl font-bold text-gray-900">

                Recent Project Photos

              </h2>

              <p className="mt-1 text-sm text-gray-500">

                Latest photographs uploaded to this project

              </p>

            </div>

            <Link

              href={`/projects/${projectId}/photos`}

              className="text-sm font-semibold text-orange-600 hover:underline"

            >

              View All Photos →

            </Link>

          </div>

          {recentPhotos.length === 0 ? (

            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">

              <p className="text-3xl">📸</p>

              <p className="mt-3 font-medium text-gray-700">

                No project photos yet

              </p>

              <p className="mt-2 text-sm text-gray-500">

                Upload site photos to keep track of construction progress.

              </p>

              <Link

                href={`/projects/${projectId}/photos`}

                className="mt-5 inline-block rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700"

              >

                Upload Photos

              </Link>

            </div>

          ) : (

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {recentPhotos.map((photo) => {

                const imageUrl =

                  `/projects/${projectId}/photos/${photo.id}/image`;

                return (

                  <a

                    key={photo.id}

                    href={imageUrl}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="group overflow-hidden rounded-xl border border-gray-200"

                  >

                    {/* eslint-disable-next-line @next/next/no-img-element */}

                    <img

                      src={imageUrl}

                      alt={photo.description || photo.fileName}

                      loading="lazy"

                      className="h-44 w-full object-cover transition group-hover:scale-105"

                    />

                    <div className="p-3">

                      <p className="truncate text-sm font-medium text-gray-900">

                        {photo.fileName}

                      </p>

                      <p className="mt-1 text-xs text-gray-500">

                        {photo.category}

                      </p>

                    </div>

                  </a>

                );

              })}

            </div>

          )}

        </section>

        {/* PROJECT INFORMATION */}

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">

          <h2 className="text-xl font-bold text-gray-900">

            Project Information

          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-3">

            <div>

              <p className="text-sm text-gray-500">Client</p>

              {customer ? (

                <Link

                  href={`/customers/${customer.id}`}

                  className="mt-2 inline-block font-semibold text-orange-600 hover:underline"

                >

                  {customer.name}

                </Link>

              ) : (

                <p className="mt-2 font-semibold text-gray-900">

                  {project.client}

                </p>

              )}

            </div>

            <div>

              <p className="text-sm text-gray-500">Currency</p>

              <p className="mt-2 font-semibold text-gray-900">

                {project.currency}

              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">

                Start Date

              </p>

              <p className="mt-2 font-semibold text-gray-900">

                {project.startDate

                  ? new Date(

                      project.startDate

                    ).toLocaleDateString("en-GB")

                  : "Not set"}

              </p>

            </div>

          </div>

          <div className="mt-7 border-t border-gray-100 pt-6">

            <p className="text-sm text-gray-500">

              Description

            </p>

            <p className="mt-2 whitespace-pre-wrap text-gray-800">

              {project.description || "No description added."}

            </p>

          </div>

        </section>

        {/* FOOTER */}

        <div className="mt-8 pb-8">

          <Link

            href="/projects"

            className="text-sm font-semibold text-gray-500 hover:text-orange-600"

          >

            ← Back to All Projects

          </Link>

        </div>

      </div>

    </main>

  );

}
