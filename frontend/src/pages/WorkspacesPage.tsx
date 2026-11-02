import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import {
  FolderKanban,
  Plus,
  Trash2,
  Edit2,
  ArrowRight,
  Files,
  MessageSquare,
  Search,
} from 'lucide-react';
import { Workspace } from '../types';

export const WorkspacesPage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentWsId, setCurrentWsId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadWorkspaces = async () => {
    setIsLoading(true);
    try {
      const data = await api.request<Workspace[]>('/workspaces/');
      setWorkspaces(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setName('');
    setDescription('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ws: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode('edit');
    setCurrentWsId(ws.id);
    setName(ws.name);
    setDescription(ws.description || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (wsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete workspace? All associated documents, chats, and vectors will be permanently removed.')) {
      return;
    }
    try {
      await api.request(`/workspaces/${wsId}`, { method: 'DELETE' });
      setWorkspaces((prev) => prev.filter((w) => w.id !== wsId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete workspace');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (modalMode === 'create') {
        const newWs = await api.request<Workspace>('/workspaces/', {
          method: 'POST',
          body: JSON.stringify({ name, description }),
        });
        setWorkspaces((prev) => [newWs, ...prev]);
      } else if (currentWsId) {
        const updated = await api.request<Workspace>(`/workspaces/${currentWsId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, description }),
        });
        setWorkspaces((prev) => prev.map((w) => (w.id === currentWsId ? updated : w)));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-full flex flex-col">
      <Header title="Research Workspaces" subtitle="Partitioned context environments for academic literature" />

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-medium" />
            <input
              type="text"
              placeholder="Filter workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-mono-white border border-mono-border rounded-md text-mono-deepblack placeholder:text-mono-medium focus:outline-none focus:ring-1 focus:ring-mono-black"
            />
          </div>

          <Button size="sm" onClick={handleOpenCreate}>
            <Plus size={14} />
            <span>Create Workspace</span>
          </Button>
        </div>

        {/* Workspaces Grid */}
        {filteredWorkspaces.length === 0 ? (
          <Card className="p-12 text-center bg-mono-white border-dashed">
            <FolderKanban size={36} className="mx-auto text-mono-medium mb-3" />
            <h4 className="font-heading font-semibold text-sm text-mono-deepblack mb-1">
              No Workspaces Found
            </h4>
            <p className="text-xs text-mono-medium max-w-sm mx-auto mb-4">
              Get started by creating your first dedicated workspace to begin uploading and querying research papers.
            </p>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus size={14} />
              <span>New Workspace</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkspaces.map((ws) => (
              <Card
                key={ws.id}
                hoverable
                onClick={() => navigate(`/workspace/${ws.id}`)}
                className="flex flex-col justify-between h-52 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-mono-light border border-mono-border text-mono-dark">
                      Active Workspace
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleOpenEdit(ws, e)}
                        className="p-1 rounded text-mono-medium hover:text-mono-black hover:bg-mono-light transition-colors"
                        title="Edit workspace"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(ws.id, e)}
                        className="p-1 rounded text-mono-medium hover:text-red-700 hover:bg-mono-light transition-colors"
                        title="Delete workspace"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-heading font-bold text-base text-mono-deepblack line-clamp-1">
                    {ws.name}
                  </h4>
                  <p className="text-xs text-mono-dark mt-1 line-clamp-2 leading-relaxed">
                    {ws.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-mono-border">
                  <div className="flex items-center justify-between text-xs text-mono-medium mb-2 font-mono">
                    <span className="flex items-center gap-1">
                      <Files size={12} />
                      <span>{ws.document_count} papers</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      <span>{ws.conversation_count} chats</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium text-mono-deepblack group-hover:text-mono-dark">
                    <span>Enter Research Workspace</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create Research Workspace' : 'Edit Workspace'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <Input
            label="Workspace Name"
            placeholder="e.g. Attention & Transformer Variants"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-mono-dark">
              Description / Research Hypothesis
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Comparative analysis of linear attention, sparse attention, and FlashAttention kernel optimizations."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-mono-white text-mono-deepblack placeholder:text-mono-medium border border-mono-border rounded-md shadow-subtle focus:outline-none focus:ring-1 focus:ring-mono-black"
            />
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
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              <span>{modalMode === 'create' ? 'Create' : 'Save Changes'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

