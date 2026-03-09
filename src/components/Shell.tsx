'use client';

import { useEffect, useState, useCallback } from 'react';
import { useKernelStore } from '@/stores/kernel-store';
import { useWebSocket } from '@/hooks/useWebSocket';

interface SessionSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  unread?: number;
  messageCount: number;
  lastMessage?: string;
}

interface SessionMessage {
  id: string;
  role: string;
  content: string;
  thinking?: string;
  timestamp: string;
}

/**
 * Shell component - Module-aware UI shell
 *
 * When no UI module is installed, renders a basic terminal-only interface.
 * When a UI module (e.g., module-ui) provides panels, activity bar items,
 * sidebars etc., Shell composes them into the full desktop experience.
 */
export default function Shell() {
  const { jwt, modules, modulesLoaded, setModules, logout } =
    useKernelStore();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');

  // WebSocket connection
  const handleWsMessage = useCallback(
    (data: unknown) => {
      const event = data as Record<string, unknown>;

      switch (event.type) {
        case 'sessions_list':
          setSessions(event.sessions as SessionSummary[]);
          break;

        case 'session_created': {
          const newSession = event.session as SessionSummary;
          setSessions((prev) => [
            { ...newSession, messageCount: 0 },
            ...prev,
          ]);
          break;
        }

        case 'session_update': {
          const updated = event.session as SessionSummary;
          setSessions((prev) =>
            prev.map((s) =>
              s.id === updated.id ? { ...s, ...updated } : s,
            ),
          );
          break;
        }

        case 'session_deleted': {
          const deletedId = event.sessionId as string;
          setSessions((prev) => prev.filter((s) => s.id !== deletedId));
          if (activeSessionId === deletedId) {
            setActiveSessionId(null);
            setMessages([]);
          }
          break;
        }

        case 'session_state': {
          const session = event.session as {
            messages: SessionMessage[];
          };
          setMessages(session.messages || []);
          break;
        }

        case 'message': {
          const msg = event.message as SessionMessage;
          setMessages((prev) => [...prev, msg]);
          if (msg.role === 'assistant') {
            setStreaming(false);
            setStreamContent('');
          }
          break;
        }

        case 'stream': {
          const content = event.content as string;
          setStreaming(true);
          setStreamContent((prev) => prev + content);
          break;
        }

        case 'done':
          setStreaming(false);
          setStreamContent('');
          break;
      }
    },
    [activeSessionId],
  );

  const { send } = useWebSocket({ onMessage: handleWsMessage });

  // Load modules on mount
  useEffect(() => {
    if (!jwt || modulesLoaded) return;

    fetch('/api/modules', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setModules(data.modules || []);
      })
      .catch(() => {
        setModules([]);
      });
  }, [jwt, modulesLoaded, setModules]);

  // Create new session
  const handleNewSession = async () => {
    if (!jwt) return;

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (res.ok) {
      const data = await res.json();
      setActiveSessionId(data.session.id);
      setMessages([]);
    }
  };

  // Send message
  const handleSend = () => {
    if (!input.trim() || !activeSessionId || streaming) return;

    send({
      type: 'send_message',
      sessionId: activeSessionId,
      content: input.trim(),
    });

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Basic terminal-mode UI (no UI module installed)
  return (
    <div className="h-screen w-screen flex bg-surface-0 text-text-primary">
      {/* Sidebar */}
      <div className="w-64 border-r border-border-default flex flex-col bg-surface-1">
        <div className="p-4 border-b border-border-default flex items-center justify-between">
          <span className="font-semibold text-sm">ClaudeOS</span>
          <div className="flex gap-2">
            <button
              onClick={handleNewSession}
              className="text-xs px-2 py-1 bg-accent hover:bg-accent-hover rounded transition-colors"
            >
              New
            </button>
            <button
              onClick={logout}
              className="text-xs px-2 py-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Module info */}
        {modulesLoaded && modules.length === 0 && (
          <div className="p-3 text-xs text-text-tertiary border-b border-border-subtle">
            No UI modules installed. Terminal mode active.
          </div>
        )}

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => {
                setActiveSessionId(session.id);
                // Fetch session details
                if (jwt) {
                  fetch(`/api/sessions/${session.id}`, {
                    headers: { Authorization: `Bearer ${jwt}` },
                  })
                    .then((res) => res.json())
                    .then((data) => setMessages(data.session?.messages || []))
                    .catch(() => {});
                }
              }}
              className={`w-full text-left p-3 border-b border-border-subtle
                         hover:bg-surface-2 transition-colors ${
                           activeSessionId === session.id
                             ? 'bg-surface-2'
                             : ''
                         }`}
            >
              <div className="text-sm truncate">{session.title}</div>
              <div className="text-xs text-text-tertiary mt-1 flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    session.status === 'active'
                      ? 'bg-green-400'
                      : session.status === 'error'
                        ? 'bg-red-400'
                        : 'bg-text-tertiary'
                  }`}
                />
                {session.status}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {activeSessionId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${
                    msg.role === 'user'
                      ? 'ml-12'
                      : msg.role === 'assistant'
                        ? 'mr-12'
                        : 'mx-12 text-center'
                  }`}
                >
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-accent/20 border border-accent/30'
                        : msg.role === 'assistant'
                          ? 'bg-surface-2 border border-border-default'
                          : 'bg-surface-3 text-text-secondary'
                    }`}
                  >
                    <div className="text-xs text-text-tertiary mb-1">
                      {msg.role}
                    </div>
                    <div className="whitespace-pre-wrap font-mono text-xs">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming content */}
              {streaming && streamContent && (
                <div className="mr-12">
                  <div className="p-3 rounded-lg text-sm bg-surface-2 border border-border-default">
                    <div className="text-xs text-text-tertiary mb-1">
                      assistant
                    </div>
                    <div className="whitespace-pre-wrap font-mono text-xs">
                      {streamContent}
                      <span className="animate-pulse">|</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border-default p-4">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    streaming
                      ? 'Waiting for response...'
                      : 'Type a message...'
                  }
                  disabled={streaming}
                  className="flex-1 px-4 py-3 bg-surface-2 border border-border-default rounded-lg
                             text-text-primary placeholder:text-text-tertiary font-mono text-sm
                             focus:outline-none focus:border-accent resize-none
                             disabled:opacity-50 transition-colors"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || streaming}
                  className="px-4 py-3 bg-accent hover:bg-accent-hover
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white text-sm font-medium rounded-lg
                             transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-accent/20 mx-auto flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-accent" />
              </div>
              <h2 className="text-lg font-semibold">ClaudeOS v3</h2>
              <p className="text-sm text-text-secondary max-w-sm">
                {modules.length > 0
                  ? `${modules.length} module${modules.length === 1 ? '' : 's'} loaded`
                  : 'Terminal mode - no UI modules installed'}
              </p>
              <button
                onClick={handleNewSession}
                className="px-6 py-2 bg-accent hover:bg-accent-hover
                           text-white text-sm font-medium rounded-lg
                           transition-colors"
              >
                New Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
