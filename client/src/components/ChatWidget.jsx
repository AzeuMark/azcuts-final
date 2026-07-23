import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';

import { chatbotApi } from '../api/chatbot.api';
import { getApiErrorMessage } from '../config/axios';
import { useAuth } from '../hooks/useAuth';
import cn from '../utils/cn';

// Azeu AI brand mark (copied into client/public/assets; also lives in server/ai).
const AZEU_AI_LOGO = '/assets/aichatbot-logo.png';

const BUBBLE = 48; // launcher size (h-12 / w-12)
const EDGE = 16; // viewport margin
const GAP = 12; // space between the panel and the launcher bubble
const TOP_LIMIT = 72; // keep the widget below the 64px sticky navbar
const DESKTOP_MQ = '(min-width: 768px)'; // dragging is desktop-only
const POS_KEY = 'az-chat-pos';
const SEEN_KEY = 'az-chat-seen';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

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

  // Dragging (desktop only). `pos` = bubble top-left while closed; `panelPos` =
  // panel top-left while open. The bubble is derived from panelPos when open, so
  // the two move together as one connected unit.
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia(DESKTOP_MQ).matches;
  });
  const [pos, setPos] = useState(() => {
    try {
      const s = localStorage.getItem(POS_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [panelPos, setPanelPos] = useState(null);
  const [hintOn, setHintOn] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [hintVisible, setHintVisible] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const dragRef = useRef({ active: false, moved: false, sx: 0, sy: 0, ol: 0, ot: 0 });
  const panelDrag = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  // Panel dimensions are fixed by CSS (h-[min(70vh,32rem)], w capped at 24rem),
  // so we can compute them without measuring the DOM.
  const panelWH = () => ({
    w: Math.min(384, window.innerWidth - 2 * EDGE),
    h: Math.min(Math.round(window.innerHeight * 0.7), 512),
  });

  // Where the bubble sits while closed (dragged position on desktop, else docked).
  const bubbleBase = () => {
    if (isDesktop && pos) return { left: pos.x, top: pos.y };
    return {
      left: window.innerWidth - BUBBLE - EDGE,
      top: window.innerHeight - BUBBLE - EDGE,
    };
  };

  const clampBubble = (x, y) => ({
    x: clamp(x, EDGE, Math.max(EDGE, window.innerWidth - BUBBLE - EDGE)),
    y: clamp(y, TOP_LIMIT, Math.max(TOP_LIMIT, window.innerHeight - BUBBLE - EDGE)),
  });

  // Keep the whole open unit (panel + gap + bubble below it) on-screen, below navbar.
  const clampUnit = (x, y) => {
    const { w, h } = panelWH();
    const unitH = h + GAP + BUBBLE;
    return {
      x: clamp(x, EDGE, Math.max(EDGE, window.innerWidth - w - EDGE)),
      y: clamp(y, TOP_LIMIT, Math.max(TOP_LIMIT, window.innerHeight - unitH - EDGE)),
    };
  };

  // Bubble position while open = derived from the panel (sits below its right edge).
  const derivedBubble = () => {
    const { w, h } = panelWH();
    return { x: panelPos.x + w - BUBBLE, y: panelPos.y + h + GAP };
  };

  const computeOpenPos = () => {
    const base = bubbleBase();
    const { w, h } = panelWH();
    return clampUnit(base.left + BUBBLE - w, base.top - GAP - h);
  };

  const toggleOpen = () => {
    if (open) {
      // Closing: leave the bubble where it currently sits (desktop only).
      if (isDesktop && panelPos) {
        const { w, h } = panelWH();
        setPos(clampBubble(panelPos.x + w - BUBBLE, panelPos.y + h + GAP));
      }
      setOpen(false);
      return;
    }
    setPanelPos(computeOpenPos());
    setOpen(true);
  };

  // Reset the conversation whenever the effective guide role changes.
  useEffect(() => {
    setMessages([{ role: 'assistant', content: guide.greeting }]);
    setStreamIdx(-1);
    setStreamLen(0);
  }, [guideRole, guide.greeting]);

  // Track desktop vs mobile for enabling/disabling dragging.
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(DESKTOP_MQ);
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Drive the typewriter reveal (finishes fast regardless of reply length).
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

  // Keep the latest content in view (follows the streaming text as it grows).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open, streamLen]);

  // Focus the composer when the panel opens.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  // Persist a dragged bubble position + keep it on-screen across resizes.
  useEffect(() => {
    try {
      if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos));
    } catch {
      /* storage unavailable */
    }
  }, [pos]);

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clampBubble(p.x, p.y) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the open panel fully visible (below navbar) when the window resizes.
  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => setPanelPos((p) => (p ? clampUnit(p.x, p.y) : p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Periodic "Need help?" nudge: show ~3.5s, hide ~4.5s, repeat (while closed).
  useEffect(() => {
    if (open || !hintOn) {
      setHintVisible(false);
      return undefined;
    }
    let timer;
    const schedule = (show) => {
      setHintVisible(show);
      timer = setTimeout(() => schedule(!show), show ? 3500 : 4500);
    };
    timer = setTimeout(() => schedule(true), 1200);
    return () => clearTimeout(timer);
  }, [open, hintOn]);

  // Once the chat has been opened, stop nudging (remembered across visits).
  useEffect(() => {
    if (open && hintOn) {
      setHintOn(false);
      try {
        localStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* storage unavailable */
      }
    }
  }, [open, hintOn]);

  /* ---- Bubble drag (desktop only, while closed) + click-to-toggle ---- */
  const onPointerDown = (e) => {
    const rect = launcherRef.current?.getBoundingClientRect();
    dragRef.current = {
      active: true,
      moved: false,
      sx: e.clientX,
      sy: e.clientY,
      ol: rect?.left ?? 0,
      ot: rect?.top ?? 0,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active || !isDesktop || open) return; // no drag on mobile or when open
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    d.moved = true;
    setPos(clampBubble(d.ol + dx, d.ot + dy));
  };
  const onPointerUp = (e) => {
    const d = dragRef.current;
    d.active = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!d.moved) toggleOpen(); // treated as a click
  };

  /* ---- Panel drag via the header (desktop only) ---- */
  const onHeaderPointerDown = (e) => {
    if (!isDesktop || !panelPos) return;
    panelDrag.current = { active: true, sx: e.clientX, sy: e.clientY, ox: panelPos.x, oy: panelPos.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onHeaderPointerMove = (e) => {
    const d = panelDrag.current;
    if (!d.active) return;
    setPanelPos(clampUnit(d.ox + (e.clientX - d.sx), d.oy + (e.clientY - d.sy)));
  };
  const onHeaderPointerUp = (e) => {
    panelDrag.current.active = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const canSend = input.trim().length > 0 && !sending;

  async function sendMessage(text) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const withUser = [...messages, { role: 'user', content }];
    setMessages(withUser);
    setInput('');
    setSending(true);

    try {
      const { data } = await chatbotApi.send(withUser);
      const reply = data?.reply || "Sorry, I couldn't come up with a reply. Please try again.";
      const assistantIdx = withUser.length;
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

  const showSuggestions = useMemo(
    () => messages.filter((m) => m.role === 'user').length === 0,
    [messages]
  );

  // Launcher (bubble) placement: follows the panel when open; dragged/docked when closed.
  let launcherStyle;
  if (open && panelPos) {
    const b = derivedBubble();
    launcherStyle = { left: b.x, top: b.y, right: 'auto', bottom: 'auto' };
  } else if (isDesktop && pos) {
    launcherStyle = { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' };
  }

  const base = bubbleBase();
  const hintOnRight = base.left + BUBBLE / 2 > window.innerWidth / 2; // bubble on right → pill on its left

  return (
    <>
      {/* Chat panel — draggable via header (desktop), always clamped on-screen */}
      {open && panelPos && (
        <div
          role="dialog"
          aria-label="Azeu AI assistant"
          style={{ left: panelPos.x, top: panelPos.y }}
          className="fixed z-sticky flex h-[min(70vh,32rem)] w-[calc(100vw-2rem)] max-w-sm animate-scale-in flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        >
          {/* Header — plain brand color; drag handle to move the panel */}
          <div
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerUp}
            onPointerCancel={onHeaderPointerUp}
            style={isDesktop ? { touchAction: 'none' } : undefined}
            className={cn(
              'flex select-none items-center gap-3 border-b border-line bg-brand px-4 py-3 text-white',
              isDesktop && 'cursor-move'
            )}
          >
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
              onPointerDown={(e) => e.stopPropagation()}
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

      {/* Launcher — connected to the panel; drag when closed (desktop only) */}
      <div
        ref={launcherRef}
        style={launcherStyle}
        className={cn(
          'fixed z-sticky h-12 w-12',
          !launcherStyle && 'bottom-4 right-4 sm:bottom-6 sm:right-6'
        )}
      >
        {/* "Need help?" nudge — appears then hides on a loop while closed */}
        {!open && hintOn && (
          <button
            type="button"
            onClick={toggleOpen}
            aria-hidden={!hintVisible}
            tabIndex={hintVisible ? 0 : -1}
            className={cn(
              'absolute top-0 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink shadow-pop transition-all duration-300 ease-out hover:text-brand',
              hintOnRight ? 'right-full mr-2.5' : 'left-full ml-2.5',
              hintVisible
                ? 'opacity-100'
                : `pointer-events-none opacity-0 ${hintOnRight ? 'translate-x-1' : '-translate-x-1'}`
            )}
          >
            Need help?
          </button>
        )}

        {/* Attention ripple (behind the bubble, only while closed) */}
        {!open && (
          <>
            <span className="pointer-events-none absolute inset-0 rounded-full bg-brand/40 animate-ripple" />
            <span
              className="pointer-events-none absolute inset-0 rounded-full bg-brand/30 animate-ripple"
              style={{ animationDelay: '1.2s' }}
            />
          </>
        )}

        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={(e) => {
            dragRef.current.active = false;
            e.currentTarget.releasePointerCapture?.(e.pointerId);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleOpen();
            }
          }}
          aria-label={open ? 'Close Azeu AI chat' : 'Open Azeu AI chat'}
          aria-expanded={open}
          style={{ touchAction: 'none' }}
          className={cn(
            'relative flex h-12 w-12 select-none items-center justify-center overflow-hidden rounded-full shadow-pop transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app',
            open
              ? 'cursor-pointer bg-brand text-brand-fg'
              : cn('bg-white', isDesktop ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer')
          )}
        >
          {open ? (
            <X className="h-5 w-5" />
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
    </>
  );
}
