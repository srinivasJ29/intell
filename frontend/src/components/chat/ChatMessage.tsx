import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Bot, User } from 'lucide-react';
import { Message } from '../../types';
import { CitationPill } from './CitationPill';

interface ChatMessageProps {
  message: Message;
  onNavigateCitation?: (documentId: string, pageNumber: number) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onNavigateCitation,
}) => {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`py-4 px-5 border-b border-mono-border flex gap-4 ${
        isAssistant ? 'bg-mono-white' : 'bg-mono-offwhite'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded flex items-center justify-center shrink-0 border ${
          isAssistant
            ? 'bg-mono-deepblack text-mono-white border-mono-deepblack'
            : 'bg-mono-white text-mono-dark border-mono-border'
        }`}
      >
        {isAssistant ? <Bot size={15} /> : <User size={15} />}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-heading font-semibold text-xs tracking-wide text-mono-deepblack">
            {isAssistant ? 'IntelliResearch Assistant' : 'Researcher'}
          </span>
          {isAssistant && (
            <button
              onClick={handleCopy}
              className="p-1 rounded text-mono-medium hover:text-mono-deepblack hover:bg-mono-light transition-colors"
              title="Copy answer"
            >
              {copied ? <Check size={13} className="text-mono-black" /> : <Copy size={13} />}
            </button>
          )}
        </div>

        {/* Markdown Body */}
        <div className="prose prose-sm max-w-none text-mono-deepblack text-xs leading-relaxed font-sans prose-headings:font-heading prose-headings:tracking-tight prose-headings:font-bold prose-p:my-1.5 prose-blockquote:border-l-2 prose-blockquote:border-mono-black prose-blockquote:bg-mono-light prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r prose-pre:bg-mono-black prose-pre:text-mono-white prose-table:border prose-table:border-mono-border prose-th:border prose-th:border-mono-border prose-th:bg-mono-light prose-td:border prose-td:border-mono-border">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>

        {/* Supporting Evidence / Citations */}
        {message.citations_json && message.citations_json.length > 0 && (
          <div className="pt-2 border-t border-mono-border/60">
            <div className="text-[10px] font-mono uppercase tracking-wider text-mono-medium mb-1.5 font-semibold">
              Grounded Source Evidence ({message.citations_json.length}):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.citations_json.map((cite, idx) => (
                <CitationPill
                  key={idx}
                  index={idx}
                  citation={cite}
                  onNavigate={onNavigateCitation}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

