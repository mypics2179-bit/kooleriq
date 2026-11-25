import React, { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Globe,
  Send,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { ChatMessageItem } from '../types/kooleriq';
import { KoolerIQLogo } from './KoolerIQLogo';

interface AiAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessageItem[];
  onSendMessage: (
    message: string,
    modelMode: 'standard' | 'fast',
    useSearchGrounding: boolean
  ) => Promise<void>;
  onClearHistory: () => void;
  isSending: boolean;
  errorMsg: string | null;
}

const QUICK_PROMPTS = [
  'Which cooler door needs restocking first?',
  'Explain the Door 04 temperature alert',
  'What are top 2026 c-store energy drink trends?',
  'Summarize KoolerIQ Google Play pricing tiers',
];

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  open,
  onClose,
  messages,
  onSendMessage,
  onClearHistory,
  isSending,
  errorMsg,
}) => {
  const [input, setInput] = useState('');
  const [modelMode, setModelMode] = useState<'standard' | 'fast'>('standard');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages.length, isSending]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    await onSendMessage(text, modelMode, modelMode === 'standard' && useSearchGrounding);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-lg h-full bg-[var(--kq-canvas)] border-l border-[var(--kq-accent-border)] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label="KoolerIQ Gemini Merchandising Assistant"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[var(--kq-border)] bg-[var(--kq-surface)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <KoolerIQLogo size={34} showWordmark={false} />
            <div className="min-w-0">
              <h2 className="text-sm font-display font-bold text-[var(--kq-text)] truncate">
                KoolerIQ Merchandising Copilot
              </h2>
              <p className="text-[11px] font-mono-tabular text-[var(--kq-text-muted)] truncate">
                {modelMode === 'fast'
                  ? 'gemini-3.1-flash-lite · Fast Aisle Mode'
                  : useSearchGrounding
                    ? 'gemini-4-hydrogen · Web Search Grounded'
                    : 'gemini-4-hydrogen · Store Telemetry Mode'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded text-[var(--kq-text-muted)] hover:text-[var(--kq-crimson)] hover:bg-[var(--kq-surface-muted)] transition-colors"
                aria-label="Clear conversation history"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)] hover:bg-[var(--kq-surface-muted)] transition-colors"
              aria-label="Close assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Model & Grounding Controls */}
        <div className="px-4 py-2.5 border-b border-[var(--kq-border)] bg-[var(--kq-surface-muted)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-0.5 rounded bg-[var(--kq-surface)] border border-[var(--kq-border)]">
            <button
              type="button"
              onClick={() => setModelMode('standard')}
              className={`min-h-[32px] px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                modelMode === 'standard'
                  ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                  : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
              }`}
            >
              Analyst
            </button>
            <button
              type="button"
              onClick={() => setModelMode('fast')}
              className={`min-h-[32px] px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                modelMode === 'fast'
                  ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)]'
                  : 'text-[var(--kq-text-secondary)] hover:text-[var(--kq-text)]'
              }`}
            >
              <Zap className="w-3 h-3" />
              Fast
            </button>
          </div>

          {modelMode === 'standard' && (
            <button
              type="button"
              onClick={() => setUseSearchGrounding((v) => !v)}
              className={`min-h-[32px] px-2.5 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1.5 ${
                useSearchGrounding
                  ? 'bg-[var(--kq-emerald-soft)] border-[var(--kq-emerald)] text-[var(--kq-emerald-text)]'
                  : 'bg-[var(--kq-surface)] border-[var(--kq-border)] text-[var(--kq-text-muted)]'
              }`}
            >
              <Globe className="w-3 h-3" />
              Google Search: {useSearchGrounding ? 'On' : 'Off'}
            </button>
          )}
        </div>

        {/* Scrollable Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4 py-4">
              <div className="rounded-xl bg-[var(--kq-surface)] border border-[var(--kq-border)] p-4 space-y-2">
                <p className="text-sm font-semibold text-[var(--kq-text)]">
                  Ready to assist on active store coolers
                </p>
                <p className="text-xs text-[var(--kq-text-secondary)] leading-relaxed">
                  Ask about OOS priority doors, compressor temperature faults, Google Play fleet
                  licensing, or enable Google Search for live 2026 convenience beverage trends.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium text-[var(--kq-text-muted)]">
                  Suggested prompts
                </div>
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() =>
                      onSendMessage(q, modelMode, modelMode === 'standard' && useSearchGrounding)
                    }
                    disabled={isSending}
                    className="w-full text-left min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[var(--kq-surface)] border border-[var(--kq-border)] hover:border-[var(--kq-accent)] text-xs text-[var(--kq-text)] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-medium'
                      : 'bg-[var(--kq-surface)] border border-[var(--kq-border)] text-[var(--kq-text)]'
                  }`}
                >
                  {msg.content}

                  {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[var(--kq-border)] space-y-1.5">
                      <div className="text-[10px] font-mono-tabular text-[var(--kq-accent)] font-semibold">
                        Google Search Sources
                      </div>
                      <div className="flex flex-col gap-1">
                        {msg.sources.slice(0, 4).map((src) => (
                          <a
                            key={src.uri}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] text-[var(--kq-emerald)] hover:underline truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono-tabular text-[var(--kq-text-muted)] mt-1 px-1">
                  {msg.role === 'user' ? 'You' : msg.modelUsed}
                </span>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex items-start">
              <div className="rounded-xl bg-[var(--kq-surface)] border border-[var(--kq-accent-border)] px-4 py-3 text-xs text-[var(--kq-accent)] font-mono-tabular">
                Analyzing cooler telemetry...
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg bg-[var(--kq-crimson-soft)] border border-[var(--kq-crimson)] px-3.5 py-2.5 text-xs text-[var(--kq-crimson-text)]">
              {errorMsg}
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>

        {/* Message Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-3.5 border-t border-[var(--kq-border)] bg-[var(--kq-surface)] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about cooler stock, temps, or market trends..."
            className="flex-1 min-h-[44px] px-3.5 rounded-lg bg-[var(--kq-surface-muted)] border border-[var(--kq-border-strong)] text-sm text-[var(--kq-text)] placeholder:text-[var(--kq-text-muted)] focus:outline-none focus:border-[var(--kq-accent)]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="min-h-[44px] min-w-[44px] px-4 rounded-lg bg-[var(--kq-accent)] text-[var(--kq-accent-fg)] font-semibold text-xs hover:bg-[var(--kq-accent-hover)] disabled:opacity-45 transition-colors flex items-center justify-center"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </div>
  );
};
