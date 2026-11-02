import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  Files,
  UploadCloud,
  Search,
  Trash2,
  ExternalLink,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
} from 'lucide-react';
import { DocumentItem, Workspace } from '../types';

export const DocumentLibraryPage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWsId, setSelectedWsId] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const ws = await api.request<Workspace[]>('/workspaces/');
        setWorkspaces(ws);
        if (ws.length > 0) {
          setSelectedWsId(ws[0].id);
        }
      } catch (e) {
        console.error('Failed to load workspaces:', e);
      }
    };
    fetchWorkspaces();
  }, []);

  const loadDocuments = async (wsId: string) => {
    if (!wsId) return;
    setIsLoading(true);
    try {
      const docs = await api.request<DocumentItem[]>(`/workspaces/${wsId}/documents`);
      setDocuments(docs);
    } catch (e) {
      console.error('Failed to load documents:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWsId) {
      loadDocuments(selectedWsId);
      // Auto-poll if any document is processing
      const interval = setInterval(() => {
        loadDocuments(selectedWsId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedWsId]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedWsId) return;
    setIsUploading(true);
    setUploadError(null);

    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setUploadError('Only PDF documents are supported for academic analysis.');
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const newDoc = await api.request<DocumentItem>(
        `/workspaces/${selectedWsId}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      setDocuments((prev) => [newDoc, ...prev]);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Delete document? File binary and Chroma vector embeddings will be permanently removed.')) {
      return;
    }
    try {
      await api.request(`/documents/${docId}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDocs = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full flex flex-col">
      <Header title="Document Library" subtitle="Ingestion pipeline, PyMuPDF extraction & vector status" />

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Workspace Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-mono-white p-4 rounded-lg border border-mono-border">
          <div className="flex items-center gap-3">
            <FolderKanban size={18} className="text-mono-dark" />
            <span className="text-xs font-semibold text-mono-deepblack uppercase tracking-wider">
              Target Workspace:
            </span>
            <select
              value={selectedWsId}
              onChange={(e) => setSelectedWsId(e.target.value)}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-mono-offwhite border border-mono-border text-mono-deepblack focus:outline-none focus:ring-1 focus:ring-mono-black"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.document_count} papers)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              accept=".pdf,application/pdf"
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
              disabled={!selectedWsId}
            >
              <UploadCloud size={14} />
              <span>Upload PDF Paper</span>
            </Button>
          </div>
        </div>

        {uploadError && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
            {uploadError}
          </div>
        )}

        {/* Drag and Drop Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-mono-border hover:border-mono-black rounded-xl p-8 text-center bg-mono-white transition-all cursor-pointer group"
        >
          <UploadCloud size={32} className="mx-auto text-mono-medium group-hover:text-mono-deepblack transition-colors mb-2" />
          <h4 className="font-heading font-semibold text-sm text-mono-deepblack mb-1">
            Drag & Drop Research Papers (PDF)
          </h4>
          <p className="text-xs text-mono-medium max-w-sm mx-auto">
            PyMuPDF automatically extracts per-page text, checks for scanned pages, generates sentence chunks, and indexes vectors in ChromaDB.
          </p>
        </div>

        {/* Documents Table */}
        <div className="bg-mono-white border border-mono-border rounded-lg overflow-hidden shadow-subtle">
          <div className="p-4 border-b border-mono-border flex items-center justify-between gap-4">
            <div className="relative w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-medium" />
              <input
                type="text"
                placeholder="Search documents by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-mono-offwhite border border-mono-border rounded-md text-mono-deepblack placeholder:text-mono-medium focus:outline-none focus:ring-1 focus:ring-mono-black"
              />
            </div>
            <span className="text-xs font-mono text-mono-medium">
              {filteredDocs.length} Total Papers
            </span>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-mono-medium text-xs">
              No research papers found in this workspace. Upload your first PDF to begin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-mono-offwhite border-b border-mono-border text-mono-dark font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Document Title</th>
                    <th className="py-3 px-4 font-semibold">Pages</th>
                    <th className="py-3 px-4 font-semibold">File Size</th>
                    <th className="py-3 px-4 font-semibold">Ingestion Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mono-border">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-mono-offwhite transition-colors">
                      <td className="py-3.5 px-4 font-medium text-mono-deepblack flex items-center gap-2.5">
                        <FileText size={16} className="text-mono-dark shrink-0" />
                        <div>
                          <div className="font-semibold">{doc.title}</div>
                          <div className="text-[10px] text-mono-medium font-mono">{doc.filename}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-mono-dark">
                        {doc.page_count > 0 ? `${doc.page_count} pages` : 'Pending'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-mono-dark">
                        {formatFileSize(doc.file_size_bytes)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            doc.status === 'READY'
                              ? 'ready'
                              : doc.status === 'PROCESSING'
                              ? 'processing'
                              : doc.status === 'FAILED'
                              ? 'failed'
                              : 'pending'
                          }
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/api/v1/documents/${doc.id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-mono-dark hover:text-mono-black hover:bg-mono-light transition-colors"
                            title="Inspect PDF"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1 rounded text-mono-dark hover:text-red-700 hover:bg-mono-light transition-colors"
                            title="Delete paper"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
