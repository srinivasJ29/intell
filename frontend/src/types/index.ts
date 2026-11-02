export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  color_tag: string;
  document_count: number;
  conversation_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentProcessingJob {
  id: string;
  document_id: string;
  stage: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress_percent: number;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface DocumentItem {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  filename: string;
  file_size_bytes: number;
  page_count: number;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  metadata_json: Record<string, any>;
  created_at: string;
  updated_at: string;
  jobs?: DocumentProcessingJob[];
}

export interface CitationItem {
  document_id: string;
  document_title: string;
  page_number: number;
  chunk_id?: string;
  snippet: string;
  relevance_score?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations_json: CitationItem[];
  metadata_json: Record<string, any>;
  token_count: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  message_count?: number;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface ComparisonCell {
  summary: string;
  citations: CitationItem[];
}

export interface ComparisonDimension {
  dimension_name: string;
  documents: Record<string, ComparisonCell>;
}

export interface ComparisonResponse {
  workspace_id: string;
  document_ids: string[];
  document_titles: Record<string, string>;
  dimensions: ComparisonDimension[];
}

export interface ResearchReport {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  report_type: string;
  content_markdown: string;
  pdf_storage_key?: string | null;
  source_document_ids: string[];
  metrics_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMetric {
  workspace_id: string;
  workspace_name: string;
  document_count: number;
  conversation_count: number;
  report_count: number;
}

export interface AnalyticsSummary {
  total_workspaces: number;
  total_documents: number;
  total_pages_indexed: number;
  total_conversations: number;
  total_messages: number;
  total_reports_generated: number;
  storage_used_bytes: number;
  workspaces_breakdown: WorkspaceMetric[];
  system_status: Record<string, any>;
}
