import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../../../../../../src/prisma/db";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string; extraWorkId: string }> };
function fmt(value: number) {
  return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(value);
}
function dateText(value: string) {
  const date=value.slice(0,10);
  const [y,m,d]=date.split("-");
  return y&&m&&d ? `${d}/${m}/${y}` : date;
}
export default async function ExtraWorkDocument({params}:Props) {
  const {id,extraWorkId}=await params;
  const projectId=Number(id), workId=Number(extraWorkId);
  if(!Number.isSafeInteger(projectId)||projectId<=0||!Number.isSafeInteger(workId)||workId<=0) notFound();
  const [project,work]=await Promise.all([
    db.orm.public.Project.first({id:projectId}),
    db.orm.public.ExtraWork.first({id:workId})
  ]);
  if(!project||!work||work.projectId!==projectId) notFound();
  return <main className="min-h-screen bg-gray-100 py-8 text-gray-800">
    <style>{`@page{size:A4;margin:0}@media print{.extra-work-controls{display:none!important}.extra-work-sheet{box-shadow:none!important;width:100%!important;min-height:auto!important}body{background:white!important}}`}</style>
    <nav className="extra-work-controls mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3 px-3">
      <Link className="rounded bg-white px-4 py-2 text-sm" href={`/projects/${projectId}/extra-works`}>← Extra Works</Link>
      <p className="text-xs text-gray-600">Preview only · Print from browser (A4)</p>
    </nav>
    <article className="extra-work-sheet mx-auto min-h-[1122px] w-full max-w-[794px] bg-white shadow-lg">
      <div className="h-3 bg-orange-600"/>
      <div className="flex flex-wrap justify-between gap-6 px-10 pt-9">
        <div className="text-sm leading-6">
          <h1 className="text-xl font-bold text-orange-600">Resolve Construction Ltd</h1>
          <p>Unit 27, Block 3, Watergardens, Gibraltar</p>
          <p>GX11 1AA · +350 54099237</p>
          <p>www.resolveconstructionltd.com</p>
          <p>inforesolveconstruction@gmail.com</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black tracking-wide text-orange-600">EXTRA WORK</h2>
          <p className="text-sm font-semibold">Ref: EW-{String(work.id).padStart(4,"0")}</p>
          <p className="mt-2 text-sm">Date: {dateText(work.date)}</p>
          <p className="text-sm">Status: {work.status}</p>
        </div>
      </div>
      <section className="px-10 pb-6 pt-10">
        <h3 className="text-xs font-bold tracking-widest text-orange-600">BILL TO</h3>
        <p className="mt-2 font-semibold">{project.client}</p>
        <p className="mt-1 text-sm text-gray-600">Project: {project.name}</p>
      </section>
      <section className="px-10">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup><col style={{width:"58%"}}/><col style={{width:"17%"}}/><col style={{width:"8%"}}/><col style={{width:"17%"}}/></colgroup>
          <thead className="bg-orange-600 text-white"><tr>
            <th className="p-3">DESCRIPTION</th><th className="p-3 text-right">RATE</th><th className="p-3 text-right">QTY</th><th className="p-3 text-right">AMOUNT</th>
          </tr></thead>
          <tbody><tr className="border-b align-top"><td className="whitespace-pre-wrap break-words p-3"><strong>{work.title}</strong>{work.description ? <p className="mt-2">{work.description}</p> : null}</td><td className="p-3 text-right">{fmt(Number(work.amount))}</td><td className="p-3 text-right">1</td><td className="p-3 text-right font-semibold">{fmt(Number(work.amount))}</td></tr></tbody>
        </table>
        <div className="mt-8 flex justify-end"><div className="flex w-64 justify-between border-t-2 border-orange-600 pt-3 font-bold"><span>Total</span><span>{fmt(Number(work.amount))}</span></div></div>
        <p className="mt-16 border-t pt-4 text-xs text-gray-500">Additional work quotation for the named project. This document is not an invoice or proof of customer approval. Confirm the scope and approval before billing.</p>
      </section>
    </article>
  </main>;
}
