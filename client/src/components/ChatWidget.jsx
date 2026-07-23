import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';

import { chatbotApi } from '../api/chatbot.api';
import { getApiErrorMessage } from '../config/axios';
import { useAuth } from '../hooks/useAuth';
import cn from '../utils/cn';

// Azeu AI brand mark (copied into client/public/assets; also lives in server/ai).
const AZEU_AI_LOGO = '/assets/aichatbot-logo.png';

// Role-specific greeting + starter questions. Guests (not signed in) get the
// customer guide. The SERVER still decides which knowledge prompt to use from
// the auth token — this only tailors the on-screen copy.
const GUIDE = {
  user: {
    greeting:
      "Hi, I'm **Azeu AI**. I can help you book an appointment, manage your bookings, and get the most out of AzCuts. What would you like to know?",
    suggestions: [
      'How do I book an appointment?',
      'How do I cancel a booking?',
      'How do I rate my barber?',
    ],
  },
  staff: {
    greeting:
      "Hi, I'm **Azeu AI**. I can walk you through your staff tools: handling appointments, your shift, and your history. How can I help?",
    suggestions: [
      'How do I accept an appointment?',
      'What happens when I reject one?',
      'How do I go on or off shift?',
    ],
  },
  admin: {
    greeting:
      "Hi, I'm **Azeu AI**. I can guide you through running the shop: users, inventory, discounts, analytics, and system settings. What do you need?",
    suggestions: [
      'How do I add a staff account?',
      'How do I set a booking discount?',
      'What do the system modes mean?',
    ],
  },
};

/* ---------------------------------------------------------------------------
 * Minimal markdown renderer.
 * Handles the formatting Azeu AI actually emits: **bold**, *italic* / _italic_,
 * `inline code`, bullet lists (-, *), numbered lists (1.), and line breaks.
 * Kept dependency-free and scoped to the chat bubble.
 * ------------------------------------------------------------------------- */
const INLINE_RE = /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|`([^`\n]+)`)/g;

function renderInline(text, keyPrefix) {
  const nodes = [];
  let last = 0;
  let m;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold">
          {m[2]}
        </strong>
      );
    } else if (m[3] !== undefined || m[4] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i${i}`}>{m[3] ?? m[4]}</em>);
    } else if (m[5] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/15"
        >
          {m[5]}
        </code>
      );
    }
    last = INLINE_RE.lastIndex;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function FormattedMessage({ text }) {
  const blocks = useMemo(() => {
    const lines = text.split('\n');
    const out = [];
    let para = [];
    let list = null; // { type: 'ul' | 'ol', items: [] }

    const flushPara = () => {
      if (para.length) {
        out.push({ kind: 'p', lines: para });
        para = [];
      }
    };
    const flushList = () => {
      if (list) {
        out.push({ kind: list.type, items: list.items });
        list = null;
      }
    };

    lines.forEach((line) => {
      const ul = line.match(/^\s*[-*]\s+(.*)$/);
      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ul) {
        flushPara();
        if (!list || list.type !== 'ul') {
          flushList();
          list = { type: 'ul', items: [] };
        }
        list.items.push(ul[1]);
      } else if (ol) {
        flushPara();
        if (!list || list.type !== 'ol') {
          flushList();
          list = { type: 'ol', items: [] };
        }
        list.items.push(ol[1]);
      } else if (line.trim() === '') {
        flushPara();
        flushList();
      } else {
        flushList();
        para.push(line);
      }
    });
    flushPara();
    flushList();
    return out;
  }, [text]);

  return (
    <div className="space-y-1.5">
      {blocks.map((b, bi) => {
        if (b.kind === 'ul') {
          return (
            <ul key={bi} className="list-disc space-y-0.5 pl-4">
              {b.items.map((it, ii) => (
                <li key={ii}>{renderInline(it, `${bi}-${ii}`)}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === 'ol') {
          return (
            <ol key={bi} className="list-decimal space-y-0.5 pl-4">
              {b.items.map((it, ii) => (
                <li key={ii}>{renderInline(it, `${bi}-${ii}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={bi}>
            {b.lines.map((ln, li) => (
              <span key={li}>
                {renderInline(ln, `${bi}-${li}`)}
                {li < b.lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Azeu AI is typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export default function ChatWidget() {
  const { isAuthenticated, role } = useAuth();
  const guideRole = isAuthenticated && GUIDE[role] ? role : 'user';
  const guide = GUIDE[guideRole];

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // [{ role, content }]
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Typewriter streaming: which message index is animating + how many chars shown.
  const [streamIdx, setStreamIdx] = useState(-1);
  const [streamLen, setStreamLen] = useState(0);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Reset the conversation whenever the effective guide role changes
  // (e.g. a guest logs in, or a user logs out) so greeting + context match.
  useEffect(() => {
    setMessages([{ role: 'assistant', content: guide.greeting }]);
    setStreamIdx(-1);
    setStreamLen(0);
  }, [guideRole, guide.greeting]);

  // Drive the typewriter reveal. Runs while a message is streaming; finishes fast
  // regardless of reply length so it always feels like a live response.
  useEffect(() => {
    if (streamIdx < 0) return undefined;
    const full = messages[streamIdx]?.content ?? '';
    if (streamLen >= full.length) {
      setStreamIdx(-1);
      return undefined;
    }
    const step = Math.max(1, Math.ceil(full.length / 90));
    const id = setTimeout(() => setStreamLen((n) => Math.min(full.length, n + step)), 16);
    return () => clearTimeout(id);
  }, [streamIdx, streamLen, messages]);

  // Keep the latest content in view (also follows the streaming text as it grows).
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open, streamLen]);

  // Focus the composer when the panel opens.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  const canSend = input.trim().length > 0 && !sending;

  async function sendMessage(text) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const withUser = [...messages, { role: 'user', content }];
    setMessages(withUser);
    setInput('');
    setSending(true);

    try {
      // Send only the real user/assistant turns (server prepends the system prompt).
      const { data } = await chatbotApi.send(withUser);
      const reply = data?.reply || "Sorry, I couldn't come up with a reply. Please try again.";
      const assistantIdx = withUser.length; // position the assistant msg will occupy
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setStreamIdx(assistantIdx);
      setStreamLen(0);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: getApiErrorMessage(
            err,
            'Azeu AI is unavailable right now. Please try again in a moment.'
          ),
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) sendMessage();
    }
  }

  // Only show starter chips before the visitor has asked anything.
  const showSuggestions = useMemo(
    () => messages.filter((m) => m.role === 'user').length === 0,
    [messages]
  );

  return (
    <div className="fixed bottom-4 right-4 z-sticky flex flex-col items-end sm:bottom-6 sm:right-6">
      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Azeu AI assistant"
          className="mb-3 flex h-[min(70vh,32rem)] w-[calc(100vw-2rem)] max-w-sm origin-bottom-right animate-scale-in flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-brand to-accent px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/20">
              <img
                src={AZEU_AI_LOGO}
                alt="Azeu AI"
                className="h-full w-full object-cover"
                draggable="false"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Azeu AI</p>
              <p className="truncate text-xs text-white/80">Your AzCuts guide</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1.5 text-white/90 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => {
              const isStreaming = i === streamIdx;
              const shown = isStreaming ? m.content.slice(0, streamLen) : m.content;
              return (
                <div
                  key={i}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'rounded-br-sm bg-brand text-brand-fg'
                        : m.isError
                          ? 'rounded-bl-sm border border-danger/30 bg-danger/10 text-danger'
                          : 'rounded-bl-sm bg-surface-2 text-ink'
                    )}
                  >
                    <FormattedMessage text={shown} />
                    {isStreaming && (
                      <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-middle" />
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-3">
                  <TypingDots />
                </div>
              </div>
            )}

            {showSuggestions && !sending && (
              <div className="flex flex-col items-start gap-2 pt-1">
                {guide.suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-line bg-app px-3 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-line bg-surface p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about using AzCuts..."
                className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!canSend}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg transition-colors hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">
              Azeu AI guides you on using AzCuts. It can make mistakes.
            </p>
          </div>
        </div>
      )}

      {/* Launcher bubble — shows the Azeu AI logo when closed, an X when open. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Azeu AI chat' : 'Open Azeu AI chat'}
        aria-expanded={open}
        className={cn(
          'flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-pop transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app',
          open ? 'bg-brand text-brand-fg' : 'bg-white'
        )}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <img
            src={AZEU_AI_LOGO}
            alt="Azeu AI"
            className="h-full w-full object-cover"
            draggable="false"
          />
        )}
      </button>
    </div>
  );
}
