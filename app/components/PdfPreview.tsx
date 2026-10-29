'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export default function PdfPreview({ file }: { file: File }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let loading: ReturnType<typeof import('pdfjs-dist').getDocument> | undefined;
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const data = await file.arrayBuffer();
      if (disposed) return;
      loading = pdfjs.getDocument({ data });
      const document = await loading.promise;
      if (!disposed) setPdf(document);
    })().catch(() => { if (!disposed) setError('Preview unavailable. You can still download or share the PDF.'); });
    return () => { disposed = true; void loading?.destroy(); };
  }, [file]);

  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let disposed = false;
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    const element = canvas.current;
    (async () => {
      const documentPage = await pdf.getPage(page);
      if (disposed) return;
      // Render one page at a time to bound canvas memory on phones.
      const viewport = documentPage.getViewport({ scale: 1.5 * zoom / 100 });
      element.width = Math.ceil(viewport.width);
      element.height = Math.ceil(viewport.height);
      render = documentPage.render({ canvas: element, viewport });
      await render.promise;
      if (!disposed) setReady(true);
    })().catch(() => { if (!disposed) setError('This page could not be rendered. Download PDF to view it.'); });
    return () => { disposed = true; render?.cancel(); };
  }, [pdf, page, zoom]);

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg bg-white p-2 text-sm">
      <button type="button" aria-label="Previous PDF page" disabled={page <= 1 || !ready} onClick={() => { setReady(false); setPage(n => n - 1); }} className="min-h-11 rounded border px-3 disabled:opacity-40">←</button>
      <span>Page {page} of {pdf?.numPages ?? '…'}</span>
      <button type="button" aria-label="Next PDF page" disabled={!pdf || page >= pdf.numPages || !ready} onClick={() => { setReady(false); setPage(n => n + 1); }} className="min-h-11 rounded border px-3 disabled:opacity-40">→</button>
      <label>Zoom <select aria-label="PDF zoom" value={zoom} onChange={e => { setReady(false); setZoom(Number(e.target.value)); }} className="min-h-11 rounded border px-2"><option value={100}>Fit width</option><option value={150}>150%</option><option value={200}>200%</option></select></label>
    </div>
    {error ? <p role="alert">{error}</p> : !ready && <p role="status">Rendering PDF…</p>}
    <div className="overflow-x-auto rounded bg-slate-300 p-1">
      <div style={{ width: `${zoom}%` }}><canvas ref={canvas} role="img" aria-label={`PDF preview, page ${page}`} data-rendered={ready} className="h-auto w-full bg-white shadow" /></div>
    </div>
  </div>;
}
