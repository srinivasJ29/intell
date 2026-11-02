import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { CitationPill } from '../components/chat/CitationPill';
import {
  Scale,
  Download,
  FolderKanban,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Workspace, DocumentItem, ComparisonResponse } from '../types';

export const ComparisonPage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWsId, setSelectedWsId] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    if (!selectedWsId) return;
    const fetchDocs = async () => {
      try {
        const docs = await api.request<DocumentItem[]>(`/workspaces/${selectedWsId}/documents`);
        setDocuments(docs);
        // Select up to first 3 papers by default
        setSelectedDocIds(docs.slice(0, 3).map((d) => d.id));
        setComparison(null);
      } catch (e) {
        console.error(e);
      }
    };
    fetchDocs();
  }, [selectedWsId]);

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleRunComparison = async () => {
    if (selectedDocIds.length === 0 || !selectedWsId) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.request<ComparisonResponse>(
        `/workspaces/${selectedWsId}/compare`,
        {
          method: 'POST',
          body: JSON.stringify({ document_ids: selectedDocIds }),
        }
      );
      setComparison(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate comparison matrix.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportAsCsv = () => {
    if (!comparison) return;
    const headers = ['Dimension', ...comparison.document_ids.map((id) => comparison.document_titles[id])];
    const rows = comparison.dimensions.map((dim) => {
      const cells = comparison.document_ids.map((id) => `"${(dim.documents[id]?.summary || '').replace(/"/g, '""')}"`);
      return [`"${dim.dimension_name}"`, ...cells].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `literature_comparison_matrix.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full flex flex-col">
      <Header title="Multi-Document Comparison Matrix" subtitle="Cross-paper comparative synthesis across academic dimensions" />

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Workspace & Document Selection Controls */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FolderKanban size={18} className="text-mono-dark" />
              <span className="text-xs font-semibold text-mono-deepblack uppercase tracking-wider">
                Select Workspace:
              </span>
              <select
                value={selectedWsId}
                onChange={(e) => setSelectedWsId(e.target.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-md bg-mono-offwhite border border-mono-border text-mono-deepblack focus:outline-none focus:ring-1 focus:ring-mono-black"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {comparison && (
                <Button size="sm" variant="outline" onClick={exportAsCsv} className="gap-1.5">
                  <FileSpreadsheet size={14} />
                  <span>Export CSV</span>
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleRunComparison}
                isLoading={isLoading}
                disabled={selectedDocIds.length === 0}
              >
                <Scale size={14} />
                <span>Execute Matrix Comparison</span>
              </Button>
            </div>
          </div>

          {/* Paper Checkbox Selector */}
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-mono-medium mb-2 block font-semibold">
              Select 2 to 5 Papers to Cross-Examine:
            </span>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    onClick={() => toggleDocSelection(doc.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border font-medium transition-all ${
                      isSelected
                        ? 'bg-mono-deepblack text-mono-white border-mono-deepblack shadow-subtle'
                        : 'bg-mono-white hover:bg-mono-light border-mono-border text-mono-dark'
                    }`}
                  >
                    {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                    <span className="truncate max-w-[200px]">{doc.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {error && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Comparison Matrix Table */}
        {!comparison ? (
          <Card className="p-16 text-center bg-mono-white border-dashed">
            <Scale size={36} className="mx-auto text-mono-medium mb-3" />
            <h4 className="font-heading font-semibold text-sm text-mono-deepblack mb-1">
              Comparison Matrix Uninitialized
            </h4>
            <p className="text-xs text-mono-medium max-w-sm mx-auto mb-4">
              Select target publications above and click 'Execute Matrix Comparison' to contrast objectives, architectures, datasets, and benchmark results side-by-side.
            </p>
          </Card>
        ) : (
          <div className="bg-mono-white border border-mono-border rounded-lg overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-mono-deepblack text-mono-white font-mono uppercase text-[11px]">
                    <th className="py-3 px-4 font-semibold w-56 border-r border-mono-dark">
                      Research Dimension
                    </th>
                    {comparison.document_ids.map((docId) => (
                      <th key={docId} className="py-3 px-4 font-semibold border-r border-mono-dark last:border-r-0 min-w-[260px]">
                        {comparison.document_titles[docId]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-mono-border">
                  {comparison.dimensions.map((dim, idx) => (
                    <tr
                      key={dim.dimension_name}
                      className={idx % 2 === 0 ? 'bg-mono-white' : 'bg-mono-offwhite/50'}
                    >
                      <td className="py-3.5 px-4 font-heading font-semibold text-mono-deepblack border-r border-mono-border align-top">
                        {dim.dimension_name}
                      </td>
                      {comparison.document_ids.map((docId) => {
                        const cell = dim.documents[docId];
                        return (
                          <td
                            key={docId}
                            className="py-3.5 px-4 text-mono-dark border-r border-mono-border last:border-r-0 align-top leading-relaxed space-y-2"
                          >
                            <p>{cell?.summary || '—'}</p>
                            {cell?.citations && cell.citations.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {cell.citations.map((c, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="px-1.5 py-0.5 rounded bg-mono-light border border-mono-border text-[10px] font-mono text-mono-dark"
                                  >
                                    Page {c.page_number}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
