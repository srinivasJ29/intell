import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { CitationItem } from '../../types';

interface CitationPillProps {
  citation: CitationItem;
  index: number;
  onNavigate?: (documentId: string, pageNumber: number) => void;
}

export const CitationPill: React.FC<CitationPillProps> = ({
  citation,
  index,
  onNavigate,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(citation.document_id, citation.page_number);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-mono-light hover:bg-mono-border text-mono-deepblack border border-mono-border hover:border-mono-medium transition-all text-xs font-mono group text-left max-w-full"
      title={`Jump to ${citation.document_title} (Page ${citation.page_number})\n\n"${citation.snippet}"`}
    >
      <span className="w-4 h-4 rounded-full bg-mono-deepblack text-mono-white text-[10px] flex items-center justify-center shrink-0">
        {index + 1}
      </span>
      <span className="truncate max-w-[140px] font-sans font-medium text-[11px]">
        {citation.document_title}
      </span>
      <span className="text-[10px] text-mono-dark px-1 rounded bg-mono-white border border-mono-border shrink-0">
        p.{citation.page_number}
      </span>
      <ExternalLink size={11} className="text-mono-medium group-hover:text-mono-deepblack shrink-0" />
    </button>
  );
};

