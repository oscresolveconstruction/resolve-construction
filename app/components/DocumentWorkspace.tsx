'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const PdfPreview = dynamic(() => import('./PdfPreview'), { ssr: false, loading: () => <p role="status">Loading preview…</p> });

type Props = { number: string; pdfUrl: string; editable?: boolean; children: ReactNode; history: ReactNode };

export default function DocumentWorkspace({ number, pdfUrl, editable = false, children, history }: Props) {
  const [tab, setTab] = useState('details');
  const [pdf, setPdf] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const id = useId();
  const tabs = [{ id: 'details', label: editable ? 'Edit' : 'Details' }, { id: 'preview', label: 'Preview' }, { id: 'history', label: 'History' }];

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    (async () => {
      try {
        const response = await fetch(pdfUrl, { cache: 'no-store', signal: controller.signal });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('PDF unavailable');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        const file = new File([blob], `${number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`, { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(file);
        setPdf({ file, url: objectUrl });
      } catch {
        if (!controller.signal.aborted) setError('The PDF could not be loaded. Please retry or reload the page.');
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [pdfUrl, number, retry]);

  async function share() {
    if (!pdf || sharing || dirty) return;
    setNotice('');
    // The file is prepared BEFORE the tap: iOS requires user activation at share().
    if (!navigator.share || !navigator.canShare?.({ files: [pdf.file] })) {
      setNotice('This browser cannot share PDF files. Use Download PDF, then share the saved file.');
      return;
    }
    setSharing(true);
    try {
      await navigator.share({ files: [pdf.file], title: number });
      // Opening the system sheet is not evidence of delivery. Do not mark as sent.
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Sharing could not be opened. Try again or use Download PDF.');
    } finally { setSharing(false); }
  }

  return <div className="relative space-y-4 pb-28">
    <div role="tablist" aria-label="Document views" className="sticky top-0 z-10 grid grid-cols-3 rounded-xl border bg-white shadow-sm">
      {tabs.map((item, index) => <button key={item.id} id={`${id}-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls={`${id}-${item.id}-panel`} tabIndex={tab === item.id ? 0 : -1}
        onClick={() => setTab(item.id)} onKeyDown={event => {
          const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
          if (target >= 0) { event.preventDefault(); setTab(tabs[target].id); document.getElementById(`${id}-${tabs[target].id}`)?.focus(); }
        }} className={`min-h-12 border-b-4 px-3 py-3 font-semibold ${tab === item.id ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-600'}`}>{item.label}</button>)}
    </div>
    {dirty && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Save your changes before previewing or sharing the PDF.</p>}
    <section role="tabpanel" id={`${id}-details-panel`} aria-labelledby={`${id}-details`} hidden={tab !== 'details'} onChangeCapture={() => setDirty(true)} onClickCapture={event => { if (editable && event.target instanceof Element && event.target.closest('button[type="button"]')) setDirty(true); }} className="space-y-5 [&>form]:rounded-xl [&>form]:bg-white [&>form]:p-4">{children}</section>
    <section role="tabpanel" id={`${id}-preview-panel`} aria-labelledby={`${id}-preview`} hidden={tab !== 'preview'} className="rounded-xl bg-slate-200 p-2 sm:p-4">
      {tab === 'preview' && !dirty && (pdf ? <PdfPreview file={pdf.file} /> : !error && <p role="status" className="p-6">Preparing PDF…</p>)}
      {dirty && <p className="p-6">Return to {editable ? 'Edit' : 'Details'} to save your changes.</p>}
    </section>
    <section role="tabpanel" id={`${id}-history-panel`} aria-labelledby={`${id}-history`} hidden={tab !== 'history'} className="space-y-3 rounded-xl border bg-white p-4">{history}</section>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4">{error} <button type="button" className="underline" onClick={() => { setError(''); setRetry(n => n + 1); }}>Retry PDF</button></div>}
    {notice && <p role="status" className="rounded-xl bg-amber-50 p-4">{notice}</p>}
    <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border bg-white p-3 shadow-lg" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      {pdf && !dirty && <a href={pdf.url} download={pdf.file.name} className="rounded-full border px-4 py-3 text-sm font-semibold">Download PDF</a>}
      <button type="button" onClick={share} disabled={!pdf || sharing || dirty} className="flex min-h-12 items-center gap-2 rounded-full bg-orange-600 px-6 py-3 font-semibold text-white disabled:opacity-50">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8" /></svg>{sharing ? 'Sharing…' : !pdf && !error ? 'Preparing PDF…' : 'Share'}
      </button>
    </div>
  </div>;
}
