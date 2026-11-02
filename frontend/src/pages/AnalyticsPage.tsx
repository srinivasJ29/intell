import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import {
  BarChart3,
  Database,
  Files,
  FolderKanban,
  MessageSquare,
  FileText,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { AnalyticsSummary } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await api.request<AnalyticsSummary>('/analytics/summary');
        setStats(data);
      } catch (e) {
        console.error('Failed to load analytics:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-full flex flex-col">
      <Header title="Corpus & System Analytics" subtitle="Genuine statistics on indexed papers, vector chunks, and research activity" />

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Core System Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between text-mono-medium mb-2">
              <span className="text-xs font-mono uppercase tracking-wider">Total Workspaces</span>
              <FolderKanban size={16} className="text-mono-dark" />
            </div>
            <div className="font-heading text-3xl font-bold text-mono-deepblack">
              {stats?.total_workspaces ?? 0}
            </div>
            <div className="text-[11px] text-mono-dark mt-1 font-mono">Isolated research partitions</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between text-mono-medium mb-2">
              <span className="text-xs font-mono uppercase tracking-wider">Documents Ingested</span>
              <Files size={16} className="text-mono-dark" />
            </div>
            <div className="font-heading text-3xl font-bold text-mono-deepblack">
              {stats?.total_documents ?? 0}
            </div>
            <div className="text-[11px] text-mono-dark mt-1 font-mono">
              {stats?.total_pages_indexed ?? 0} total pages cataloged
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between text-mono-medium mb-2">
              <span className="text-xs font-mono uppercase tracking-wider">Research Queries</span>
              <MessageSquare size={16} className="text-mono-dark" />
            </div>
            <div className="font-heading text-3xl font-bold text-mono-deepblack">
              {stats?.total_messages ?? 0}
            </div>
            <div className="text-[11px] text-mono-dark mt-1 font-mono">
              Across {stats?.total_conversations ?? 0} sessions
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between text-mono-medium mb-2">
              <span className="text-xs font-mono uppercase tracking-wider">Storage Consumed</span>
              <HardDrive size={16} className="text-mono-dark" />
            </div>
            <div className="font-heading text-3xl font-bold text-mono-deepblack">
              {formatBytes(stats?.storage_used_bytes ?? 0)}
            </div>
            <div className="text-[11px] text-mono-dark mt-1 font-mono">Original PDF binaries</div>
          </Card>
        </div>

        {/* System Engine Health & Components */}
        <Card className="p-6">
          <h3 className="font-heading font-bold text-base text-mono-deepblack mb-4 flex items-center gap-2">
            <Cpu size={18} />
            <span>AI Subsystem Operational Status</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats?.system_status &&
              Object.entries(stats.system_status).map(([k, v]) => (
                <div key={k} className="p-3.5 rounded-lg bg-mono-offwhite border border-mono-border">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-mono-medium block mb-1">
                    {k.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-mono-deepblack">
                    <CheckCircle2 size={13} className="text-mono-black" />
                    <span>{String(v)}</span>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Workspaces Breakdown Table */}
        <div className="bg-mono-white border border-mono-border rounded-lg overflow-hidden shadow-subtle">
          <div className="p-4 border-b border-mono-border">
            <h3 className="font-heading font-bold text-base text-mono-deepblack">
              Workspace Allocation Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-mono-offwhite border-b border-mono-border text-mono-dark font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Workspace Name</th>
                  <th className="py-3 px-4 font-semibold">Papers Indexed</th>
                  <th className="py-3 px-4 font-semibold">Conversations</th>
                  <th className="py-3 px-4 font-semibold">Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mono-border font-mono">
                {stats?.workspaces_breakdown.map((wb) => (
                  <tr key={wb.workspace_id} className="hover:bg-mono-offwhite">
                    <td className="py-3 px-4 font-sans font-semibold text-mono-deepblack">
                      {wb.workspace_name}
                    </td>
                    <td className="py-3 px-4 text-mono-dark">{wb.document_count}</td>
                    <td className="py-3 px-4 text-mono-dark">{wb.conversation_count}</td>
                    <td className="py-3 px-4 text-mono-dark">{wb.report_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
