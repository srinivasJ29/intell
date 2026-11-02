import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api/client';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import {
  FileText,
  Plus,
  Download,
  FolderKanban,
  Trash2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Workspace, ResearchReport } from '../types';

export const ReportsPage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWsId, setSelectedWsId] = useState<string>('');
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ResearchReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('COMPREHENSIVE');
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

  const loadReports = async (wsId: string) => {
    if (!wsId) return;
    setIsLoading(true);
    try {
      const data = await api.request<ResearchReport[]>(`/workspaces/${wsId}/reports`);
      setReports(data);
      if (data.length > 0) {
        setSelectedReport(data[0]);
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
      loadReports(selectedWsId);
    }
  }, [selectedWsId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWsId || !title.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const newReport = await api.request<ResearchReport>(
        `/workspaces/${selectedWsId}/reports`,
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            report_type: reportType,
          }),
        }
      );
      setReports((prev) => [newReport, ...prev]);
      setSelectedReport(newReport);
      setIsModalOpen(false);
      setTitle('');
    } catch (err: any) {
      setError(err?.message || 'Failed to generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete report permanently?')) return;
    try {
      await api.request(`/reports/${reportId}`, { method: 'DELETE' });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (selectedReport?.id === reportId) {
        setSelectedReport(reports[1] || null);
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
      <Header title="Research Reports" subtitle="Automated multi-document synthesis & publication exports" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Drawer: Report Registry */}
        <div className="w-80 bg-mono-white border-r border-mono-border flex flex-col shrink-0">
          <div className="p-4 border-b border-mono-border space-y-3 bg-mono-offwhite">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-mono-dark">
                Workspace:
              </span>
              <Button size="sm" onClick={() => setIsModalOpen(true)} className="h-7 text-xs px-2.5">
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

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-mono-medium">
                No reports compiled yet. Click 'New Report' to synthesize documents.
              </div>
            ) : (
              reports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-mono-deepblack text-mono-white border-mono-deepblack shadow-subtle'
                        : 'bg-mono-white hover:bg-mono-light border-mono-border text-mono-deepblack'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-mono-light/20 border border-current text-current">
                        {r.report_type}
                      </span>
                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        className="opacity-70 hover:opacity-100 p-0.5"
                        title="Delete report"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <h5 className="font-heading font-semibold text-xs line-clamp-1">
                      {r.title}
                    </h5>
                    <div className="text-[10px] font-mono mt-1 opacity-70 flex items-center gap-1">
                      <Calendar size={10} />
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
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-mono-dark" />
                  <span className="font-heading font-semibold text-xs text-mono-deepblack truncate max-w-md">
                    {selectedReport.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={downloadMarkdown} className="h-8 text-xs gap-1.5">
                    <Download size={13} />
                    <span>Download Markdown (.md)</span>
                  </Button>
                </div>
              </div>

              {/* Markdown Document Content */}
              <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full">
                <article className="bg-mono-white border border-mono-border rounded-xl p-10 shadow-subtle prose prose-sm max-w-none text-mono-deepblack font-sans prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-mono-deepblack prose-table:border prose-table:border-mono-border prose-th:bg-mono-light prose-th:border prose-th:border-mono-border prose-td:border prose-td:border-mono-border prose-blockquote:border-mono-black prose-blockquote:bg-mono-light prose-blockquote:py-1 prose-blockquote:px-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
              <p className="text-xs max-w-xs">
                Select an existing report from the list or click 'New Report' to compile a synthesis across your research papers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compile Report Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Synthesize Research Report"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          {error && (
            <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <Input
            label="Report Title"
            placeholder="e.g. Comparative Synthesis of Efficient Transformer Architectures"
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
              <option value="COMPREHENSIVE">Comprehensive Literature Synthesis (Objectives, Methods, Results)</option>
              <option value="COMPARATIVE">Comparative Benchmark Analysis (Matrix & Metrics Focus)</option>
              <option value="EXECUTIVE_SUMMARY">Executive Briefing & Findings Overview</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isGenerating}>
              <Sparkles size={14} />
              <span>Compile Synthesis</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

