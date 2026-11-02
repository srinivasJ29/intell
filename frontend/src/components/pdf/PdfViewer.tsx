import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { DocumentItem } from '../../types';

interface PdfViewerProps {
  document: DocumentItem | null;
  targetPage?: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ document, targetPage }) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (targetPage && targetPage > 0) {
      setCurrentPage(targetPage);
    }
  }, [targetPage]);

  useEffect(() => {
    if (document) {
      setCurrentPage(targetPage || 1);
    }
  }, [document?.id]);

  useEffect(() => {
    if (!document) {
      setBlobUrl(null);
      return;
    }

    let isMounted = true;
    let createdUrl: string | null = null;
    setIsLoadingPdf(true);
    setPdfLoadError(null);

    const token = localStorage.getItem('intelliresearch_access_token');
    fetch(`/api/v1/documents/${document.id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (!isMounted) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      })
      .catch((err) => {
        if (!isMounted) return;
        setPdfLoadError(err.message || 'Failed to stream PDF');
      })
      .finally(() => {
        if (isMounted) setIsLoadingPdf(false);
      });

    return () => {
      isMounted = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [document?.id]);

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-mono-offwhite border-r border-mono-border">
        <div className="w-12 h-12 rounded-lg bg-mono-light border border-mono-border flex items-center justify-center text-mono-medium mb-3">
          <FileText size={24} />
        </div>
        <h4 className="font-heading font-semibold text-sm text-mono-deepblack mb-1">
          No Document Selected
        </h4>
        <p className="text-xs text-mono-medium max-w-xs leading-relaxed">
          Select a research paper from the document library or click a citation in the assistant to inspect source pages.
        </p>
      </div>
    );
  }

  const token = localStorage.getItem('intelliresearch_access_token');
  const directTabUrl = `/api/v1/documents/${document.id}/file?token=${encodeURIComponent(token || '')}#page=${currentPage}`;
  const pdfViewSource = blobUrl ? `${blobUrl}#page=${currentPage}&zoom=${zoomLevel}` : directTabUrl;

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (document.page_count && currentPage < document.page_count) {
      setCurrentPage((prev) => prev + 1);
    } else {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="h-full flex flex-col bg-mono-light border-r border-mono-border overflow-hidden select-none">
      {/* Top PDF Controls Toolbar */}
      <div className="h-12 bg-mono-white border-b border-mono-border px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText size={16} className="text-mono-dark shrink-0" />
          <span className="font-heading font-semibold text-xs text-mono-deepblack truncate max-w-xs" title={document.title}>
            {document.title}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-mono-offwhite border border-mono-border text-mono-dark shrink-0">
            {document.filename}
          </span>
        </div>

        {/* Navigation & Zoom controls */}
        <div className="flex items-center gap-3">
          {/* Page Pagination */}
          <div className="flex items-center gap-1.5 bg-mono-offwhite border border-mono-border rounded px-2 py-0.5 text-xs font-mono">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-mono-light disabled:opacity-30 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-mono-deepblack font-semibold min-w-[20px] text-center">
              {currentPage}
            </span>
            <span className="text-mono-medium">/</span>
            <span className="text-mono-dark">
              {document.page_count > 0 ? document.page_count : '—'}
            </span>
            <button
              onClick={handleNextPage}
              disabled={document.page_count > 0 && currentPage >= document.page_count}
              className="p-1 rounded hover:bg-mono-light disabled:opacity-30 transition-colors"
              title="Next Page"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-mono-offwhite border border-mono-border rounded px-1.5 py-0.5 text-xs font-mono">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
              className="p-1 rounded hover:bg-mono-light text-mono-dark hover:text-mono-black transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-mono-dark min-w-[36px] text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
              className="p-1 rounded hover:bg-mono-light text-mono-dark hover:text-mono-black transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Open full file tab */}
          <a
            href={directTabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-mono-light text-mono-dark hover:text-mono-black transition-colors"
            title="Open in new window"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* PDF Canvas Embed */}
      <div className="flex-1 bg-mono-dark/10 relative overflow-hidden flex items-center justify-center p-2">
        {isLoadingPdf ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <Loader2 size={24} className="animate-spin text-mono-black mb-2" />
            <p className="text-xs text-mono-dark">Loading PDF paper...</p>
          </div>
        ) : pdfLoadError ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle size={24} className="text-red-700 mb-2" />
            <p className="text-xs text-red-700 mb-2">{pdfLoadError}</p>
            <a
              href={directTabUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-mono-deepblack underline hover:text-mono-dark"
            >
              Open in external viewer
            </a>
          </div>
        ) : (
          <object
            key={`${document.id}_page_${currentPage}_zoom_${zoomLevel}`}
            data={pdfViewSource}
            type="application/pdf"
            className="w-full h-full rounded shadow-subtle border border-mono-border bg-mono-white"
          >
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <p className="text-xs text-mono-dark mb-2">
                PDF preview loaded. Use controls above to navigate pages.
              </p>
              <a
                href={directTabUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-mono-deepblack underline hover:text-mono-dark"
              >
                Open PDF Document in New Tab
              </a>
            </div>
          </object>
        )}
      </div>
    </div>
  );
};
