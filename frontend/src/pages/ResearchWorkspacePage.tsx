import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { PdfViewer } from '../components/pdf/PdfViewer';
import { ChatMessage } from '../components/chat/ChatMessage';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import {
  FileText,
  Search,
  Send,
  Square,
  Sparkles,
  MessageSquare,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  UploadCloud,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { DocumentItem, Message, Conversation, Workspace } from '../types';

export const ResearchWorkspacePage: React.FC = () => {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Workspace & Docs State
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [targetPdfPage, setTargetPdfPage] = useState<number>(1);
  const [docSearch, setDocSearch] = useState('');
  const [isUploadingPaper, setIsUploadingPaper] = useState(false);
  const [workspaceUploadError, setWorkspaceUploadError] = useState<string | null>(null);
  const workspaceFileInputRef = useRef<HTMLInputElement>(null);

  // Chat State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Panel resizing / collapsible state
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested follow-up prompts
  const suggestedFollowUps = [
    'Synthesize the core architecture and mathematical formulation.',
    'What empirical benchmarks and quantitative results were achieved?',
    'What limitations or failure modes do the authors identify?',
  ];

  // 1. Load Workspace & Documents
  useEffect(() => {
    if (!workspaceId) return;

    const loadWorkspaceData = async () => {
      try {
        const [wsData, docsData, convsData] = await Promise.all([
          api.request<Workspace>(`/workspaces/${workspaceId}`),
          api.request<DocumentItem[]>(`/workspaces/${workspaceId}/documents`),
          api.request<Conversation[]>(`/workspaces/${workspaceId}/conversations`),
        ]);
        setWorkspace(wsData);
        setDocuments(docsData);
        if (docsData.length > 0) {
          setSelectedDoc(docsData[0]);
        }
        setConversations(convsData);
        if (convsData.length > 0) {
          setActiveConvId(convsData[0].id);
        }
      } catch (e) {
        console.error('Failed to load workspace data:', e);
      }
    };

    loadWorkspaceData();
  }, [workspaceId]);

  const reloadDocuments = async () => {
    if (!workspaceId) return;
    try {
      const docsData = await api.request<DocumentItem[]>(`/workspaces/${workspaceId}/documents`);
      setDocuments(docsData);
      setSelectedDoc((prev) => {
        if (!prev && docsData.length > 0) return docsData[0];
        if (prev) {
          const updated = docsData.find((d) => d.id === prev.id);
          return updated || prev;
        }
        return null;
      });
    } catch (e) {
      console.error('Failed to reload documents:', e);
    }
  };

  useEffect(() => {
    if (!workspaceId) return;
    const hasActiveProcessing = documents.some((d) => d.status === 'PENDING' || d.status === 'PROCESSING');
    if (hasActiveProcessing) {
      const timer = setInterval(reloadDocuments, 3000);
      return () => clearInterval(timer);
    }
  }, [workspaceId, documents]);

  const handleWorkspaceFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !workspaceId) return;
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setWorkspaceUploadError('Only PDF files are supported.');
      return;
    }

    setIsUploadingPaper(true);
    setWorkspaceUploadError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const newDoc = await api.request<DocumentItem>(
        `/workspaces/${workspaceId}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
    } catch (err: any) {
      setWorkspaceUploadError(err?.message || 'Failed to upload paper.');
    } finally {
      setIsUploadingPaper(false);
      if (workspaceFileInputRef.current) workspaceFileInputRef.current.value = '';
    }
  };

  // 2. Load Conversation turns
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    const loadConversation = async () => {
      try {
        const data = await api.request<any>(`/conversations/${activeConvId}`);
        setMessages(data.messages || []);
      } catch (e) {
        console.error('Failed to load conversation:', e);
      }
    };
    loadConversation();
  }, [activeConvId]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // 3. Handle citation click -> switch document & jump to cited page!
  const handleNavigateCitation = (documentId: string, pageNumber: number) => {
    const doc = documents.find((d) => d.id === documentId);
    if (doc) {
      setSelectedDoc(doc);
    }
    setTargetPdfPage(pageNumber);
  };

  // 4. Send Message with SSE Streaming
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isStreaming || !workspaceId) return;

    setInputQuery('');
    const userTurn: Message = {
      id: `temp_user_${Date.now()}`,
      conversation_id: activeConvId || '',
      role: 'user',
      content: textToSend,
      citations_json: [],
      metadata_json: {},
      token_count: textToSend.split(' ').length,
      created_at: new Date().toISOString(),
    };

    const initialAsstTurn: Message = {
      id: `temp_asst_${Date.now()}`,
      conversation_id: activeConvId || '',
      role: 'assistant',
      content: '',
      citations_json: [],
      metadata_json: {},
      token_count: 0,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userTurn, initialAsstTurn]);
    setIsStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const token = localStorage.getItem('intelliresearch_access_token');
      const response = await fetch(`/api/v1/workspaces/${workspaceId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: textToSend,
          conversation_id: activeConvId,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Inquiry failed. Server returned error.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedAnswer = '';
      let activeCitations: any[] = [];
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const event = JSON.parse(trimmed.slice(6));
                if (event.type === 'token') {
                  streamedAnswer += event.content;
                  setMessages((prev) => {
                    const next = [...prev];
                    const lastIdx = next.length - 1;
                    if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
                      next[lastIdx] = { ...next[lastIdx], content: streamedAnswer };
                    }
                    return next;
                  });
                } else if (event.type === 'done') {
                  activeCitations = event.citations || [];
                  if (event.conversation_id) {
                    setActiveConvId(event.conversation_id);
                  }
                  setMessages((prev) => {
                    const next = [...prev];
                    const lastIdx = next.length - 1;
                    if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
                      next[lastIdx] = {
                        ...next[lastIdx],
                        id: event.message_id || next[lastIdx].id,
                        citations_json: activeCitations,
                      };
                    }
                    return next;
                  });
                }
              } catch (parseErr) {
                // Ignore parse errors on malformed chunks
              }
            }
          }
        }

        // Process any final remaining buffer
        if (buffer.trim().startsWith('data: ')) {
          try {
            const event = JSON.parse(buffer.trim().slice(6));
            if (event.type === 'done') {
              activeCitations = event.citations || [];
              if (event.conversation_id) setActiveConvId(event.conversation_id);
              setMessages((prev) => {
                const next = [...prev];
                const lastIdx = next.length - 1;
                if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
                  next[lastIdx] = {
                    ...next[lastIdx],
                    id: event.message_id || next[lastIdx].id,
                    citations_json: activeCitations,
                  };
                }
                return next;
              });
            }
          } catch {}
        }

        // Reload conversation list to show new or updated chat title
        api.request<Conversation[]>(`/workspaces/${workspaceId}/conversations`)
          .then((convs) => setConversations(convs))
          .catch(() => {});
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
            next[lastIdx] = {
              ...next[lastIdx],
              content: `Error: ${err?.message || 'Failed to complete research response.'}`,
            };
          }
          return next;
        });
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const handleStopStream = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(docSearch.toLowerCase())
  );

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-mono-offwhite select-none">
      {/* Top Navigation Bar */}
      <div className="h-14 bg-mono-white border-b border-mono-border px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workspaces')}
            className="p-1.5 rounded text-mono-dark hover:text-mono-black hover:bg-mono-light transition-colors"
            title="Back to Workspaces"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-sm text-mono-deepblack">
              {workspace?.name || 'Research Workspace'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-mono-light border border-mono-border text-mono-dark">
              Three-Panel Research Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/comparisons')}
            className="text-xs gap-1.5"
          >
            <span>Compare Papers</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/reports')}
            className="text-xs gap-1.5"
          >
            <span>Generate Report</span>
          </Button>
        </div>
      </div>

      {/* THREE-PANEL RESEARCH ENVIRONMENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANEL 1: Left Document Navigation */}
        <div
          className={`bg-mono-white border-r border-mono-border flex flex-col transition-all duration-200 shrink-0 ${
            isLeftCollapsed ? 'w-12' : 'w-72'
          }`}
        >
          <div className="h-10 px-3 border-b border-mono-border flex items-center justify-between shrink-0 bg-mono-offwhite">
            {!isLeftCollapsed && (
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-mono-dark flex items-center gap-1.5">
                <FileText size={13} />
                <span>Documents ({documents.length})</span>
              </span>
            )}
            <button
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className="p-1 rounded text-mono-dark hover:text-mono-black hover:bg-mono-light transition-colors mx-auto"
              title={isLeftCollapsed ? 'Expand Documents' : 'Collapse Documents'}
            >
              {isLeftCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {!isLeftCollapsed && (
            <>
              {/* Document Filter Input and Upload Action */}
              <div className="p-2 border-b border-mono-border space-y-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mono-medium" />
                  <input
                    type="text"
                    placeholder="Search papers..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-xs bg-mono-offwhite border border-mono-border rounded text-mono-deepblack focus:outline-none focus:ring-1 focus:ring-mono-black"
                  />
                </div>

                <input
                  type="file"
                  ref={workspaceFileInputRef}
                  onChange={(e) => handleWorkspaceFileUpload(e.target.files)}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => workspaceFileInputRef.current?.click()}
                  isLoading={isUploadingPaper}
                  className="w-full text-xs py-1 h-7 gap-1"
                >
                  <UploadCloud size={12} />
                  <span>Upload PDF Paper</span>
                </Button>

                {workspaceUploadError && (
                  <div className="p-1.5 text-[10px] text-red-700 bg-red-50 border border-red-200 rounded">
                    {workspaceUploadError}
                  </div>
                )}
              </div>

              {/* Document List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredDocs.length === 0 ? (
                  <div className="p-4 text-center text-mono-medium text-xs space-y-2">
                    <p>No papers in this workspace yet.</p>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => workspaceFileInputRef.current?.click()}
                      isLoading={isUploadingPaper}
                      className="w-full text-xs"
                    >
                      <UploadCloud size={12} className="mr-1" />
                      <span>Upload First Paper</span>
                    </Button>
                  </div>
                ) : (
                  filteredDocs.map((doc) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDoc(doc);
                          setTargetPdfPage(1);
                        }}
                        className={`p-2.5 rounded-md cursor-pointer transition-all border text-left ${
                          isSelected
                            ? 'bg-mono-deepblack text-mono-white border-mono-deepblack shadow-subtle'
                            : 'bg-mono-white hover:bg-mono-light border-mono-border text-mono-deepblack'
                        }`}
                      >
                        <div className="font-heading font-semibold text-xs truncate mb-1">
                          {doc.title}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
                          <span>{doc.page_count > 0 ? `${doc.page_count} pgs` : doc.status}</span>
                          <span className="uppercase">{doc.status}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* PANEL 2: Center High-Fidelity PDF Viewer */}
        <div className="flex-1 h-full min-w-[320px] overflow-hidden">
          <PdfViewer document={selectedDoc} targetPage={targetPdfPage} />
        </div>

        {/* PANEL 3: Right Evidence-Grounded AI Research Assistant */}
        <div className="w-[450px] bg-mono-white border-l border-mono-border flex flex-col h-full shrink-0">
          {/* Chat Panel Header */}
          <div className="h-12 border-b border-mono-border px-4 flex items-center justify-between shrink-0 bg-mono-offwhite">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-mono-black" />
              <span className="font-heading font-semibold text-xs text-mono-deepblack">
                Evidence Assistant
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={handleNewChat} className="text-xs h-7 px-2">
              <Plus size={12} />
              <span>New Thread</span>
            </Button>
          </div>

          {/* Chat Messages Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-mono-light border border-mono-border flex items-center justify-center text-mono-black mb-3">
                  <Sparkles size={18} />
                </div>
                <h4 className="font-heading font-semibold text-xs text-mono-deepblack mb-1">
                  Ask Anything Across Workspace Papers
                </h4>
                <p className="text-[11px] text-mono-medium max-w-xs mb-4 leading-relaxed">
                  Responses are strictly synthesized from retrieved PDF evidence with interactive citation pills linked to source pages.
                </p>

                {/* Suggested follow ups */}
                <div className="w-full space-y-1.5 text-left">
                  <span className="text-[10px] font-mono text-mono-medium uppercase tracking-wider block">
                    Suggested Inquiries:
                  </span>
                  {suggestedFollowUps.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full p-2 text-left text-xs text-mono-dark hover:text-mono-black bg-mono-offwhite hover:bg-mono-light border border-mono-border rounded transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {messages.map((m) => (
                  <ChatMessage
                    key={m.id}
                    message={m}
                    onNavigateCitation={handleNavigateCitation}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-mono-border bg-mono-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask research questions across indexed documents..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isStreaming}
                className="flex-1 px-3 py-2 text-xs bg-mono-offwhite border border-mono-border rounded-md text-mono-deepblack placeholder:text-mono-medium focus:outline-none focus:ring-1 focus:ring-mono-black disabled:opacity-50"
              />
              {isStreaming ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStopStream}
                  className="shrink-0 h-9"
                  title="Stop generation"
                >
                  <Square size={13} className="text-red-700 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputQuery.trim()}
                  className="shrink-0 h-9"
                >
                  <Send size={13} />
                </Button>
              )}
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-mono-medium font-mono">
              <span>Strict Grounding & Citation Validation</span>
              <span>Hybrid BM25 + Dense RAG</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

