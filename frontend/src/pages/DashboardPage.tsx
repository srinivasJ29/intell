import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  FolderKanban,
  Files,
  FileText,
  Scale,
  UploadCloud,
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import { Workspace, DocumentItem, AnalyticsSummary } from '../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [wsList, analyticsData] = await Promise.all([
          api.request<Workspace[]>('/workspaces/'),
          api.request<AnalyticsSummary>('/analytics/summary').catch(() => null),
        ]);
        setWorkspaces(wsList);
        setStats(analyticsData);

        // If there's an active workspace, load its recent documents
        if (wsList.length > 0) {
          const docs = await api.request<DocumentItem[]>(
            `/workspaces/${wsList[0].id}/documents`
          );
          setRecentDocs(docs.slice(0, 5));
        }
      } catch (e) {
        console.error('Failed to load dashboard:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-full flex flex-col">
      <Header />

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Personalized Welcome Banner */}
        <div className="bg-mono-white border border-mono-border rounded-xl p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-mono-medium mb-1">
              <span>Desktop Research Suite</span>
              <span>•</span>
              <span className="text-mono-dark font-semibold">Active Session</span>
            </div>
            <h2 className="font-heading text-2xl font-bold text-mono-deepblack tracking-tight">
              {getGreeting()}, {user?.full_name || user?.email?.split('@')[0]}
            </h2>
            <p className="text-xs text-mono-dark mt-1 max-w-xl leading-relaxed">
              Synthesize academic literature, execute multi-document cross-verifications, and generate evidence-grounded reports.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/documents')}
              className="gap-1.5"
            >
              <UploadCloud size={14} />
              <span>Upload PDF</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/workspaces')}
              className="gap-1.5"
            >
              <Plus size={14} />
              <span>New Workspace</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <span className="text-[11px] font-mono text-mono-medium uppercase tracking-wider">
              Workspaces
            </span>
            <div className="font-heading text-2xl font-bold text-mono-deepblack mt-1">
              {workspaces.length}
            </div>
            <span className="text-[10px] text-mono-dark mt-1 block">Active research contexts</span>
          </Card>

          <Card className="p-4">
            <span className="text-[11px] font-mono text-mono-medium uppercase tracking-wider">
              Indexed Documents
            </span>
            <div className="font-heading text-2xl font-bold text-mono-deepblack mt-1">
              {stats?.total_documents ?? 0}
            </div>
            <span className="text-[10px] text-mono-dark mt-1 block">PDFs parsed & vectorized</span>
          </Card>

          <Card className="p-4">
            <span className="text-[11px] font-mono text-mono-medium uppercase tracking-wider">
              Pages Ingested
            </span>
            <div className="font-heading text-2xl font-bold text-mono-deepblack mt-1">
              {stats?.total_pages_indexed ?? 0}
            </div>
            <span className="text-[10px] text-mono-dark mt-1 block">Evidence pages cataloged</span>
          </Card>

          <Card className="p-4">
            <span className="text-[11px] font-mono text-mono-medium uppercase tracking-wider">
              Synthesized Reports
            </span>
            <div className="font-heading text-2xl font-bold text-mono-deepblack mt-1">
              {stats?.total_reports_generated ?? 0}
            </div>
            <span className="text-[10px] text-mono-dark mt-1 block">Publication-ready exports</span>
          </Card>
        </div>

        {/* Recent Workspaces & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Workspaces (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-mono-deepblack flex items-center gap-2">
                <FolderKanban size={18} />
                <span>Recent Research Workspaces</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/workspaces')}
                className="text-xs text-mono-dark hover:text-mono-black"
              >
                <span>View All</span>
                <ArrowRight size={13} />
              </Button>
            </div>

            {workspaces.length === 0 ? (
              <Card className="p-8 text-center bg-mono-white border-dashed">
                <FolderKanban size={32} className="mx-auto text-mono-medium mb-3" />
                <h4 className="font-heading font-semibold text-sm text-mono-deepblack mb-1">
                  No Workspaces Initialized
                </h4>
                <p className="text-xs text-mono-medium max-w-sm mx-auto mb-4">
                  Create a workspace to isolate research papers, targeted RAG indices, and comparative analyses.
                </p>
                <Button size="sm" onClick={() => navigate('/workspaces')}>
                  <Plus size={14} />
                  <span>Create First Workspace</span>
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workspaces.slice(0, 4).map((ws) => (
                  <Card
                    key={ws.id}
                    hoverable
                    onClick={() => navigate(`/workspace/${ws.id}`)}
                    className="flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-mono-light border border-mono-border text-mono-dark">
                          Workspace
                        </span>
                        <span className="text-[11px] font-mono text-mono-medium">
                          {ws.document_count} papers
                        </span>
                      </div>
                      <h4 className="font-heading font-bold text-sm text-mono-deepblack line-clamp-1">
                        {ws.name}
                      </h4>
                      {ws.description && (
                        <p className="text-xs text-mono-dark mt-1 line-clamp-2 leading-relaxed">
                          {ws.description}
                        </p>
                      )}
                    </div>
                    <div className="pt-4 mt-3 border-t border-mono-border flex items-center justify-between text-xs text-mono-medium">
                      <span>Enter Three-Panel Suite</span>
                      <ArrowRight size={13} className="text-mono-black" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Research Actions (1 Col) */}
          <div className="space-y-4">
            <h3 className="font-heading text-base font-bold text-mono-deepblack">
              Research Workflows
            </h3>
            <div className="space-y-3">
              <Card
                hoverable
                onClick={() => navigate('/comparisons')}
                className="flex items-start gap-3.5 p-4"
              >
                <div className="w-9 h-9 rounded bg-mono-light border border-mono-border flex items-center justify-center text-mono-deepblack shrink-0">
                  <Scale size={18} />
                </div>
                <div>
                  <h5 className="font-heading font-semibold text-xs text-mono-deepblack">
                    Multi-Document Comparison Matrix
                  </h5>
                  <p className="text-[11px] text-mono-dark mt-0.5 leading-relaxed">
                    Compare models, objectives, empirical datasets, and results side-by-side.
                  </p>
                </div>
              </Card>

              <Card
                hoverable
                onClick={() => navigate('/reports')}
                className="flex items-start gap-3.5 p-4"
              >
                <div className="w-9 h-9 rounded bg-mono-light border border-mono-border flex items-center justify-center text-mono-deepblack shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h5 className="font-heading font-semibold text-xs text-mono-deepblack">
                    Structured Research Reports
                  </h5>
                  <p className="text-[11px] text-mono-dark mt-0.5 leading-relaxed">
                    Synthesize executive summaries, methodology contrasts, and PDF/MD exports.
                  </p>
                </div>
              </Card>

              <Card
                hoverable
                onClick={() => navigate('/analytics')}
                className="flex items-start gap-3.5 p-4"
              >
                <div className="w-9 h-9 rounded bg-mono-light border border-mono-border flex items-center justify-center text-mono-deepblack shrink-0">
                  <BarChart2 size={18} />
                </div>
                <div>
                  <h5 className="font-heading font-semibold text-xs text-mono-deepblack">
                    Corpus & System Analytics
                  </h5>
                  <p className="text-[11px] text-mono-dark mt-0.5 leading-relaxed">
                    Inspect storage allocation, vector chunk distributions, and retrieval latencies.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

