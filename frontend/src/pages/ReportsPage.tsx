import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import {
  FileText,
  Plus,
  Download,
  FolderKanban,
  Trash2,
  Calendar,
  Sparkles,
  Printer,
  CheckSquare,
  Square,
  HelpCircle,
  Files,
} from 'lucide-react';
import { Workspace, ResearchReport, DocumentItem } from '../types';
import { MermaidDiagram } from '../components/common/MermaidDiagram';

export const ReportsPage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWsId, setSelectedWsId] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('COMPREHENSIVE');
  const [userQuery, setUserQuery] = useState('');
  const [includeAllDocs, setIncludeAllDocs] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const ws = await api.request<Workspace[]>('/workspaces/');
        setWorkspaces(ws);
        if (ws.length > 0) setSelectedWsId(ws[0].id);
      } catch (e) {
        console.error(e);
      }
    };
    fetchWorkspaces();
  }, []);

  const loadWorkspaceData = async (wsId: string) => {
    if (!wsId) return;
    setIsLoading(true);
    try {
      const [reportsData, docsData] = await Promise.all([
        api.request<ResearchReport[]>(`/workspaces/${wsId}/reports`),
        api.request<DocumentItem[]>(`/workspaces/${wsId}/documents`),
      ]);
      setReports(reportsData);
      setDocuments(docsData);
      setSelectedDocIds(docsData.map((d) => d.id));
      if (reportsData.length > 0) {
        setSelectedReport(reportsData[0]);
      } else {
        setSelectedReport(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWsId) {
      loadWorkspaceData(selectedWsId);
    }
  }, [selectedWsId]);

  const handleOpenModal = () => {
    setTitle('');
    setUserQuery('');
    setIncludeAllDocs(true);
    setSelectedDocIds(documents.map((d) => d.id));
    setError(null);
    setIsModalOpen(true);
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWsId || !title.trim()) return;

    const docIdsToUse = includeAllDocs ? documents.map((d) => d.id) : selectedDocIds;
    if (docIdsToUse.length === 0) {
      setError('Please select at least one uploaded document to analyze.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const newReport = await api.request<ResearchReport>(
        `/workspaces/${selectedWsId}/reports`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            report_type: reportType,
            document_ids: docIdsToUse,
            custom_instructions: userQuery.trim() || undefined,
          }),
        }
      );
      setReports((prev) => [newReport, ...prev]);
      setSelectedReport(newReport);
      setIsModalOpen(false);
      setTitle('');
      setUserQuery('');
    } catch (err: any) {
      setError(err?.message || 'Failed to generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete research report? This action cannot be undone.')) return;
    try {
      await api.request(`/reports/${reportId}`, { method: 'DELETE' });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (selectedReport?.id === reportId) {
        setSelectedReport(reports.find((r) => r.id !== reportId) || null);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete report');
    }
  };

  const downloadMarkdown = () => {
    if (!selectedReport) return;
    const blob = new Blob([selectedReport.content_markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport.title.toLowerCase().replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header title="Research Reports" subtitle="Multi-document synthesis, cross-paper comparison matrices, and user query answers" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer: Report Registry */}
        <div className="w-80 bg-mono-white border-r border-mono-border flex flex-col shrink-0">
          <div className="p-4 border-b border-mono-border space-y-3 bg-mono-offwhite">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-mono-dark">
                Workspace:
              </span>
              <Button size="sm" onClick={handleOpenModal} className="h-7 text-xs px-2.5">
                <Plus size={12} />
                <span>New Report</span>
              </Button>
            </div>
            <select
              value={selectedWsId}
              onChange={(e) => setSelectedWsId(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 rounded-md bg-mono-white border border-mono-border text-mono-deepblack focus:outline-none focus:ring-1 focus:ring-mono-black"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-mono-medium text-xs">
                No reports compiled in this workspace yet. Click 'New Report' to synthesize your papers.
              </div>
            ) : (
              reports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                const docCount = r.metrics_json?.document_count ?? r.source_document_ids?.length ?? 1;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-mono-deepblack text-mono-white border-mono-deepblack shadow-subtle'
                        : 'bg-mono-white hover:bg-mono-light border-mono-border text-mono-deepblack'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-heading font-semibold text-xs leading-snug line-clamp-2">
                        {r.title}
                      </span>
                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        className={`p-1 rounded opacity-60 hover:opacity-100 transition-opacity ${
                          isSelected ? 'text-mono-white hover:bg-mono-dark' : 'text-mono-dark hover:bg-mono-light'
                        }`}
                        title="Delete report"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono mt-2 opacity-75">
                      <span>{docCount} {docCount === 1 ? 'Paper' : 'Papers'} Analyzed</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center / Right: Live Markdown Report Preview */}
        <div className="flex-1 bg-mono-offwhite flex flex-col overflow-hidden">
          {selectedReport ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Report Action Bar */}
              <div className="h-12 bg-mono-white border-b border-mono-border px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText size={16} className="text-mono-dark shrink-0" />
                  <span className="font-heading font-semibold text-xs text-mono-deepblack truncate max-w-md">
                    {selectedReport.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-mono-light border border-mono-border text-mono-dark shrink-0 hidden sm:inline-block">
                    {selectedReport.metrics_json?.document_count ?? selectedReport.source_document_ids?.length ?? 1} Papers • {selectedReport.metrics_json?.total_citations ?? 0} Citations • {selectedReport.metrics_json?.word_count ?? 0} Words
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.print()} className="h-8 text-xs gap-1.5">
                    <Printer size={13} />
                    <span>Print / Save PDF</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadMarkdown} className="h-8 text-xs gap-1.5">
                    <Download size={13} />
                    <span>Download Markdown (.md)</span>
                  </Button>
                </div>
              </div>

              {/* Markdown Document Content */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12 max-w-4xl mx-auto w-full space-y-6">
                {/* Executive KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-mono-white border border-mono-border rounded-lg shadow-subtle">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-mono-medium block">
                      Scope of Analysis
                    </span>
                    <span className="font-heading font-bold text-lg text-mono-deepblack mt-0.5 block">
                      {selectedReport.metrics_json?.document_count ?? selectedReport.source_document_ids?.length ?? 1} Papers
                    </span>
                  </div>

                  <div className="p-3 bg-mono-white border border-mono-border rounded-lg shadow-subtle">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-mono-medium block">
                      Dimensions Evaluated
                    </span>
                    <span className="font-heading font-bold text-lg text-mono-deepblack mt-0.5 block">
                      {selectedReport.metrics_json?.dimensions_evaluated ?? 8} Dimensions
                    </span>
                  </div>

                  <div className="p-3 bg-mono-white border border-mono-border rounded-lg shadow-subtle">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-mono-medium block">
                      Verified Citations
                    </span>
                    <span className="font-heading font-bold text-lg text-mono-deepblack mt-0.5 block">
                      {selectedReport.metrics_json?.total_citations ?? 0} Evidence Passages
                    </span>
                  </div>

                  <div className="p-3 bg-mono-white border border-mono-border rounded-lg shadow-subtle">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-mono-medium block">
                      Word Count
                    </span>
                    <span className="font-heading font-bold text-lg text-mono-deepblack mt-0.5 block">
                      {selectedReport.metrics_json?.word_count ?? selectedReport.content_markdown.split(/\s+/).length} Words
                    </span>
                  </div>
                </div>

                <article className="bg-mono-white border border-mono-border rounded-xl p-8 md:p-12 shadow-subtle prose prose-sm max-w-none text-mono-deepblack font-sans prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-mono-deepblack prose-table:border prose-table:border-mono-border prose-th:bg-mono-light prose-th:border prose-th:border-mono-border prose-td:border prose-td:border-mono-border prose-blockquote:border-mono-black prose-blockquote:bg-mono-light prose-blockquote:py-1.5 prose-blockquote:px-4 prose-blockquote:rounded-r">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        if (language === 'mermaid') {
                          return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {selectedReport.content_markdown}
                  </ReactMarkdown>
                </article>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-mono-medium">
              <FileText size={36} className="mb-3" />
              <h4 className="font-heading font-semibold text-sm text-mono-deepblack mb-1">
                No Report Selected
              </h4>
              <p className="text-xs max-w-xs mb-4">
                Select an existing report from the list or click 'New Report' to synthesize your papers, comparative matrix, and query answers.
              </p>
              <Button size="sm" onClick={handleOpenModal}>
                <Plus size={14} className="mr-1" />
                <span>Create Research Report</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Compile Report Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Synthesize Research Report"
        maxWidth="lg"
      >
        <form onSubmit={handleGenerate} className="space-y-4 p-6">
          {error && (
            <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <Input
            label="Report Title"
            placeholder="e.g. Comparative Synthesis of Efficient Attention Architectures"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mono-dark">
              Synthesis Scope & Format
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-mono-white border border-mono-border rounded-md text-mono-deepblack focus:outline-none focus:ring-1 focus:ring-mono-black"
            >
              <option value="COMPREHENSIVE">Comprehensive Literature Synthesis (Individual Profiles + Comparative Matrix + Query Synthesis)</option>
              <option value="COMPARATIVE">Comparative Benchmark Analysis (Matrix & Metrics Focus)</option>
              <option value="QUERY_SYNTHESIS">Targeted Research Inquiry Answer across Corpus</option>
              <option value="EXECUTIVE_SUMMARY">Executive Briefing & Key Milestones</option>
            </select>
          </div>

          {/* Research Queries / Focus Questions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mono-dark flex items-center justify-between">
              <span>Research Inquiries & Questions to Answer (Optional)</span>
              <span className="font-normal font-mono text-[10px] text-mono-medium">Multi-Document RAG</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Compare the computational complexity and IO-awareness of attention mechanisms between these papers. Which approach achieves superior throughput on long sequences?"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-mono-offwhite border border-mono-border rounded-md text-mono-deepblack placeholder:text-mono-medium focus:outline-none focus:ring-1 focus:ring-mono-black resize-none"
            />
            <p className="text-[11px] text-mono-medium">
              The engine will perform hybrid semantic retrieval across all selected files and synthesize a dedicated section answering this inquiry.
            </p>
          </div>

          {/* File Selection: All or Individual */}
          <div className="border border-mono-border rounded-lg p-3 bg-mono-offwhite space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-mono-deepblack uppercase tracking-wider flex items-center gap-1.5">
                <Files size={14} />
                <span>Scope of Uploaded Files ({documents.length})</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (includeAllDocs) {
                    setIncludeAllDocs(false);
                  } else {
                    setIncludeAllDocs(true);
                    setSelectedDocIds(documents.map((d) => d.id));
                  }
                }}
                className="text-xs font-mono font-medium text-mono-dark hover:text-mono-deepblack underline"
              >
                {includeAllDocs ? 'Choose Individual Files' : 'Select All Files'}
              </button>
            </div>

            {includeAllDocs ? (
              <div className="p-2.5 bg-mono-white rounded border border-mono-border text-xs text-mono-dark flex items-center justify-between">
                <span>Analyzing all <strong>{documents.length}</strong> uploaded documents in this workspace.</span>
                <Badge variant="ready">All Included</Badge>
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-1">
                {documents.length === 0 ? (
                  <p className="text-xs text-mono-medium italic">No uploaded papers in this workspace.</p>
                ) : (
                  documents.map((doc) => {
                    const isChecked = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocSelection(doc.id)}
                        className={`p-2 rounded border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-mono-white border-mono-deepblack text-mono-deepblack' : 'bg-mono-light border-mono-border text-mono-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isChecked ? <CheckSquare size={14} className="text-mono-deepblack shrink-0" /> : <Square size={14} className="text-mono-medium shrink-0" />}
                          <span className="font-medium truncate">{doc.title}</span>
                        </div>
                        <span className="text-[10px] font-mono shrink-0 ml-2">
                          {doc.page_count > 0 ? `${doc.page_count} pgs` : doc.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-mono-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isGenerating} disabled={!title.trim() || documents.length === 0}>
              <Sparkles size={14} />
              <span>Compile Synthesis</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
