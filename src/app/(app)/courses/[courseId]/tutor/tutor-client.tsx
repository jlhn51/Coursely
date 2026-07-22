"use client";

import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { getMaterialPreview } from "@/actions/materials";
import {
  createChatSession,
  renameChatSession,
  softDeleteChatSession,
} from "@/actions/tutor";
import {
  MaterialPreviewModal,
  type MaterialPreview,
} from "@/components/material-preview-modal";

// ---------- Types ----------

type Citation = {
  chunkId: string;
  materialId: string;
  materialName: string;
  pageNumber: number | null;
  textPreview: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  createdAt: string;
  // Streaming: while the server is still producing content, isStreaming is
  // true so the UI shows a caret and buttons are disabled.
  isStreaming?: boolean;
};

type SessionListItem = {
  id: string;
  title: string;
  updatedAt: string;
};

type Props = {
  course: { id: string; name: string };
  initialSessions: SessionListItem[];
  activeSessionId: string | null;
  activeMessages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    citations: Citation[] | null;
    createdAt: string;
  }>;
  embeddedMaterialCount: number;
  starterChipContext: {
    latestTopicTitle: string | null;
    latestMaterialName: string | null;
  };
  preloadedPrompt: string | null;
};

const ONBOARDED_KEY = "tutor-onboarded";
const GROUNDING_BANNER_KEY_PREFIX = "tutor-banner-dismissed:";

// ---------- Root ----------

export function TutorClient({
  course,
  initialSessions,
  activeSessionId,
  activeMessages,
  embeddedMaterialCount,
  starterChipContext,
  preloadedPrompt,
}: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>(initialSessions);
  const [mode, setMode] = useState<"grounded" | "general">("grounded");
  const [creatingSession, startCreateSession] = useTransition();
  const [previewMaterial, setPreviewMaterial] = useState<MaterialPreview & { startPage?: number | null } | null>(null);
  // First-time walkthrough — dismissible flag lives in localStorage.
  // Lazy init so we don't run a hydration effect just to setState.
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !localStorage.getItem(ONBOARDED_KEY);
    } catch {
      return false;
    }
  });
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      /* silent */
    }
  }, []);

  const onNewSession = useCallback(() => {
    startCreateSession(async () => {
      const r = await createChatSession({ courseId: course.id });
      if (!r.success) {
        toast.error("Couldn't start chat", { description: r.error });
        return;
      }
      // Prepend optimistically so the list updates before the server re-render.
      setSessions((s) => [
        {
          id: r.sessionId,
          title: "New chat",
          updatedAt: new Date().toISOString(),
        },
        ...s,
      ]);
      router.push(`/courses/${course.id}/tutor?session=${r.sessionId}`);
    });
  }, [course.id, router, startCreateSession]);

  const onRenameSession = useCallback(
    async (sessionId: string, nextTitle: string) => {
      const trimmed = nextTitle.trim();
      if (!trimmed) return;
      setSessions((s) =>
        s.map((x) => (x.id === sessionId ? { ...x, title: trimmed } : x)),
      );
      const r = await renameChatSession({ sessionId, title: trimmed });
      if (!r.success) {
        toast.error("Rename failed", { description: r.error });
        router.refresh();
      }
    },
    [router],
  );

  const onDeleteSession = useCallback(
    async (sessionId: string) => {
      const prev = sessions;
      setSessions((s) => s.filter((x) => x.id !== sessionId));
      if (activeSessionId === sessionId) {
        router.push(`/courses/${course.id}/tutor`);
      }
      const r = await softDeleteChatSession({ sessionId });
      if (!r.success) {
        toast.error("Delete failed", { description: r.error });
        setSessions(prev);
      }
    },
    [activeSessionId, course.id, router, sessions],
  );

  const onTitleUpdate = useCallback((sessionId: string, title: string) => {
    setSessions((s) =>
      s.map((x) => (x.id === sessionId ? { ...x, title } : x)),
    );
  }, []);

  const onOpenCitation = useCallback(async (c: Citation) => {
    // Fetch fresh URL/metadata server-side so we never leak a stale link.
    const row = await getMaterialPreview(c.materialId);
    if (!row) {
      toast.error("Material unavailable", {
        description: "It may have been deleted.",
      });
      return;
    }
    setPreviewMaterial({
      id: row.id,
      name: row.name,
      url: row.url,
      fileType: row.fileType,
      fileCategory: row.fileCategory,
      fileSize: row.fileSize,
      courseName: row.courseName,
      courseId: row.courseId,
      uploadedAt: row.uploadedAt,
      startPage: c.pageNumber,
    });
  }, []);

  const hasActiveSession = Boolean(activeSessionId);

  return (
    <div className="mt-6 flex min-h-[calc(100vh-16rem)] flex-col gap-4 md:flex-row">
      {/* Sessions list — left pane */}
      <SessionList
        sessions={sessions}
        activeSessionId={activeSessionId}
        courseId={course.id}
        onNewSession={onNewSession}
        creating={creatingSession}
        onRename={onRenameSession}
        onDelete={onDeleteSession}
      />

      {/* Chat pane */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-hairline bg-white dark:bg-[#141414]">
        {hasActiveSession ? (
          <ChatPane
            key={activeSessionId}
            sessionId={activeSessionId!}
            courseId={course.id}
            courseName={course.name}
            initialMessages={activeMessages}
            mode={mode}
            setMode={setMode}
            embeddedMaterialCount={embeddedMaterialCount}
            onTitleUpdate={onTitleUpdate}
            onOpenCitation={onOpenCitation}
            preloadedPrompt={preloadedPrompt}
          />
        ) : (
          <EmptyState
            courseName={course.name}
            courseId={course.id}
            embeddedMaterialCount={embeddedMaterialCount}
            starterChipContext={starterChipContext}
            onStart={async (starter) => {
              // Create a session then jump into it, seeding the chat with
              // the starter prompt in the router param.
              const r = await createChatSession({ courseId: course.id });
              if (!r.success) {
                toast.error("Couldn't start chat", { description: r.error });
                return;
              }
              setSessions((s) => [
                {
                  id: r.sessionId,
                  title: "New chat",
                  updatedAt: new Date().toISOString(),
                },
                ...s,
              ]);
              const q = new URLSearchParams({ session: r.sessionId });
              if (starter) q.set("prompt", starter);
              router.push(`/courses/${course.id}/tutor?${q.toString()}`);
            }}
          />
        )}
      </section>

      {previewMaterial ? (
        <MaterialPreviewModal
          material={previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      ) : null}

      {showOnboarding ? (
        <OnboardingWalkthrough onDismiss={dismissOnboarding} />
      ) : null}
    </div>
  );
}

// ---------- Session list ----------

function SessionList({
  sessions,
  activeSessionId,
  courseId,
  onNewSession,
  creating,
  onRename,
  onDelete,
}: {
  sessions: SessionListItem[];
  activeSessionId: string | null;
  courseId: string;
  onNewSession: () => void;
  creating: boolean;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-hairline bg-white p-3 md:w-[240px] dark:bg-[#141414]">
      <button
        type="button"
        onClick={onNewSession}
        disabled={creating}
        className="flex w-full items-center gap-2 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 dark:hover:bg-[#6a7bff]"
      >
        <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
        <span>New chat</span>
      </button>

      <ul className="mt-3 space-y-1">
        {sessions.length === 0 ? (
          <li className="px-2 py-6 text-center text-[12.5px] text-muted">
            No chats yet.
          </li>
        ) : (
          sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              active={s.id === activeSessionId}
              courseId={courseId}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        )}
      </ul>
    </aside>
  );
}

function SessionRow({
  session,
  active,
  courseId,
  onRename,
  onDelete,
}: {
  session: SessionListItem;
  active: boolean;
  courseId: string;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  // `draft` is only used while editing — the display always reads
  // `session.title`, so we don't need a sync effect. `startEdit` seeds
  // the draft from the current title.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(session.title);
    setEditing(true);
  };

  const commit = async () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== session.title) {
      await onRename(session.id, draft);
    }
  };

  return (
    <li className="relative">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              setEditing(false);
            }
          }}
          className="w-full rounded-md border border-accent/50 bg-white px-2.5 py-1.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 dark:bg-[#0f0f0f]"
        />
      ) : (
        <div
          className={`group flex items-center gap-1 rounded-md pr-1 transition-colors ${
            active
              ? "bg-accent/10 text-accent"
              : "text-ink/85 hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
          }`}
        >
          <Link
            href={`/courses/${courseId}/tutor?session=${session.id}`}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium"
            aria-current={active ? "page" : undefined}
          >
            <MessageSquare
              size={12}
              strokeWidth={2}
              className="shrink-0 opacity-60"
              aria-hidden="true"
            />
            <span className="truncate">{session.title}</span>
          </Link>
          <button
            type="button"
            aria-label="Session menu"
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen((v) => !v);
            }}
            className="rounded p-1 text-muted opacity-0 transition-opacity hover:bg-ink/[0.04] hover:text-ink group-hover:opacity-100 focus-visible:opacity-100 dark:hover:bg-white/[0.05]"
          >
            <MoreHorizontal size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      )}

      {menuOpen ? (
        <div
          role="menu"
          onMouseLeave={() => setMenuOpen(false)}
          className="absolute right-1 top-full z-20 mt-1 w-40 rounded-md border border-hairline bg-white p-1 shadow-lg dark:bg-[#0f0f0f]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              startEdit();
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] text-ink hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
          >
            <Pencil size={12} strokeWidth={2} aria-hidden="true" /> Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void onDelete(session.id);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            <Trash2 size={12} strokeWidth={2} aria-hidden="true" /> Delete
          </button>
        </div>
      ) : null}
    </li>
  );
}

// ---------- Empty state ----------

function EmptyState({
  courseName,
  courseId,
  embeddedMaterialCount,
  starterChipContext,
  onStart,
}: {
  courseName: string;
  courseId: string;
  embeddedMaterialCount: number;
  starterChipContext: {
    latestTopicTitle: string | null;
    latestMaterialName: string | null;
  };
  onStart: (starter?: string) => Promise<void>;
}) {
  // Lazy init hydrates from sessionStorage so we skip the setState-in-effect
  // rule.
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return Boolean(
        sessionStorage.getItem(`${GROUNDING_BANNER_KEY_PREFIX}${courseId}`),
      );
    } catch {
      return false;
    }
  });

  const chips = useMemo(() => {
    const list: Array<{ label: string; prompt: string }> = [
      {
        label: "Explain this week's topic",
        prompt: `Explain this week's topic for ${courseName} clearly, with an example.`,
      },
    ];
    if (starterChipContext.latestTopicTitle) {
      list.push({
        label: `Quiz me on ${starterChipContext.latestTopicTitle}`,
        prompt: `Give me 5 quick quiz questions on "${starterChipContext.latestTopicTitle}", then wait for my answers.`,
      });
    }
    if (starterChipContext.latestMaterialName) {
      list.push({
        label: `Summarize ${starterChipContext.latestMaterialName}`,
        prompt: `Summarize "${starterChipContext.latestMaterialName}" in bullet points.`,
      });
    }
    list.push({
      label: "What's coming up this week?",
      prompt: `What deadlines and topics does ${courseName} have coming up this week?`,
    });
    return list.slice(0, 4);
  }, [courseName, starterChipContext]);

  const showBanner = embeddedMaterialCount < 3 && !bannerDismissed;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-center text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          AI Tutor
        </p>
        <h2 className="mt-3 text-center font-serif text-[36px] leading-[1.05] text-ink md:text-[44px]">
          Ask anything about{" "}
          <em className="italic text-accent">{courseName}</em>.
        </h2>

        {showBanner ? (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-hairline bg-paper p-4 dark:bg-[#0f0f0f]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/[0.10] text-accent">
                <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="flex-1 text-[13px] leading-[1.5] text-ink">
                Add materials to ground the tutor&apos;s answers in your
                professor&apos;s slides and notes. Otherwise, I&apos;ll answer
                from general knowledge — useful, but not course-specific.
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/courses/${courseId}#materials`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-[#2e3fef] dark:hover:bg-[#6a7bff]"
                  >
                    Upload materials
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          `${GROUNDING_BANNER_KEY_PREFIX}${courseId}`,
                          "1",
                        );
                      } catch {
                        /* silent */
                      }
                      setBannerDismissed(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink hover:bg-ink/[0.03] dark:bg-[#141414] dark:hover:bg-white/[0.05]"
                  >
                    Continue anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => void onStart(chip.prompt)}
              className="rounded-2xl border border-hairline bg-white p-4 text-left text-[13.5px] leading-[1.5] text-ink transition-colors hover:border-accent/40 hover:bg-accent/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#0f0f0f] dark:hover:bg-accent/[0.05]"
            >
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
                <Sparkles
                  size={11}
                  strokeWidth={2}
                  className="text-accent"
                  aria-hidden="true"
                />
                Try
              </span>
              <p className="mt-2 text-[14px] text-ink">{chip.label}</p>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => void onStart()}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Start a blank chat →
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Chat pane ----------

function ChatPane({
  sessionId,
  courseName,
  initialMessages,
  mode,
  setMode,
  embeddedMaterialCount,
  onTitleUpdate,
  onOpenCitation,
  preloadedPrompt,
}: {
  sessionId: string;
  courseId: string;
  courseName: string;
  initialMessages: Message[];
  mode: "grounded" | "general";
  setMode: (m: "grounded" | "general") => void;
  embeddedMaterialCount: number;
  onTitleUpdate: (sessionId: string, title: string) => void;
  onOpenCitation: (c: Citation) => void;
  preloadedPrompt: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>(() =>
    initialMessages.map((m) => ({ ...m, isStreaming: false })),
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages / streaming updates.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Autogrow the textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const send = useCallback(
    async (text: string) => {
      if (sending || !text.trim()) return;
      setSending(true);

      // Optimistic user + placeholder assistant.
      const tempUserId = `local-user-${Date.now()}`;
      const tempAssistantId = `local-assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempUserId,
          role: "user",
          content: text,
          citations: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: tempAssistantId,
          role: "assistant",
          content: "",
          citations: null,
          createdAt: new Date().toISOString(),
          isStreaming: true,
        },
      ]);

      setInput("");

      try {
        const res = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, content: text, mode }),
        });
        if (!res.ok || !res.body) {
          const err = await res.text().catch(() => "");
          throw new Error(err || `Request failed (${res.status})`);
        }

        // Real IDs from the server replace the optimistic ones as soon as
        // the first message-id event arrives.
        let realUserId: string | null = null;
        let realAssistantId: string | null = null;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? ""; // last chunk may be partial

          for (const raw of events) {
            const lines = raw.split("\n");
            const event = lines.find((l) => l.startsWith("event: "))?.slice(7);
            const dataLine = lines.find((l) => l.startsWith("data: "));
            if (!event || !dataLine) continue;
            const data = JSON.parse(dataLine.slice(6)) as Record<string, unknown>;

            if (event === "message-id") {
              realUserId = (data.userMessageId as string) ?? null;
              realAssistantId = (data.assistantMessageId as string) ?? null;
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id === tempUserId && realUserId)
                    return { ...m, id: realUserId };
                  if (m.id === tempAssistantId && realAssistantId)
                    return { ...m, id: realAssistantId };
                  return m;
                }),
              );
            } else if (event === "delta") {
              const delta = (data.text as string) ?? "";
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === (realAssistantId ?? tempAssistantId)
                    ? { ...m, content: m.content + delta }
                    : m,
                ),
              );
            } else if (event === "citations") {
              const cites =
                (data.citations as Citation[] | undefined) ?? null;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === (realAssistantId ?? tempAssistantId)
                    ? { ...m, citations: cites && cites.length > 0 ? cites : null }
                    : m,
                ),
              );
            } else if (event === "title") {
              const t = (data.title as string) || "";
              if (t) onTitleUpdate(sessionId, t);
            } else if (event === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === (realAssistantId ?? tempAssistantId)
                    ? { ...m, isStreaming: false }
                    : m,
                ),
              );
            } else if (event === "error") {
              throw new Error((data.error as string) || "Tutor error");
            }
          }
        }
      } catch (err) {
        toast.error("Tutor failed to respond", {
          description: err instanceof Error ? err.message : "Try again.",
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  content:
                    m.content ||
                    "Sorry — I couldn't finish that answer. Try again?",
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setSending(false);
      }
    },
    [mode, onTitleUpdate, sending, sessionId, setMessages],
  );

  // Kick off the preloaded prompt exactly once per session load.
  const firedPromptRef = useRef(false);
  useEffect(() => {
    if (firedPromptRef.current) return;
    if (!preloadedPrompt) return;
    if (messages.length > 0) return; // don't re-fire on hydrated session
    firedPromptRef.current = true;
    // send() internally schedules setState; running once per mount for a
    // URL-driven preload is intentional, so we override the lint rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void send(preloadedPrompt);
  }, [preloadedPrompt, messages.length, send]);

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    void send(text);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Top strip */}
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
        <ModePill
          mode={mode}
          setMode={setMode}
          embeddedMaterialCount={embeddedMaterialCount}
        />
      </header>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.length === 0 ? (
            <p className="text-center text-[13px] text-muted italic">
              Ask about {courseName} to get started.
            </p>
          ) : null}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onOpenCitation={onOpenCitation}
            />
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-hairline p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-hairline bg-paper p-2 focus-within:border-accent/50 dark:bg-[#0f0f0f]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                (e.metaKey || e.ctrlKey) &&
                e.key === "Enter" &&
                !e.shiftKey
              ) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              mode === "grounded"
                ? `Ask about ${courseName}…`
                : `Ask anything (general mode)…`
            }
            rows={1}
            className="min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] leading-[1.5] text-ink outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={submit}
            disabled={sending || !input.trim()}
            aria-label="Send message"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-white transition-colors hover:bg-[#2e3fef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 dark:hover:bg-[#6a7bff]"
          >
            <ArrowUp size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10.5px] text-muted">
          Cmd/Ctrl + Enter to send
        </p>
      </div>
    </div>
  );
}

// ---------- Mode pill (grounded ↔ general) ----------

function ModePill({
  mode,
  setMode,
  embeddedMaterialCount,
}: {
  mode: "grounded" | "general";
  setMode: (m: "grounded" | "general") => void;
  embeddedMaterialCount: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="tablist"
        aria-label="Answer mode"
        className="inline-flex items-center gap-0.5 rounded-full border border-hairline bg-paper p-0.5 text-[12px] font-medium dark:bg-[#0f0f0f]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "grounded"}
          onClick={() => setMode("grounded")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
            mode === "grounded"
              ? "bg-accent/15 text-accent"
              : "text-muted hover:text-ink"
          }`}
        >
          <BookOpen size={12} strokeWidth={2} aria-hidden="true" />
          Grounded
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "general"}
          onClick={() => setMode("general")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
            mode === "general"
              ? "bg-accent/15 text-accent"
              : "text-muted hover:text-ink"
          }`}
        >
          <Sparkles size={12} strokeWidth={2} aria-hidden="true" />
          General
        </button>
      </div>
      <span className="hidden text-[11.5px] text-muted sm:inline">
        {mode === "grounded"
          ? embeddedMaterialCount > 0
            ? `Grounded in ${embeddedMaterialCount} material${
                embeddedMaterialCount === 1 ? "" : "s"
              }`
            : "No materials embedded yet"
          : "General knowledge mode"}
      </span>
    </div>
  );
}

// ---------- Message bubble ----------

function MessageBubble({
  message,
  onOpenCitation,
}: {
  message: Message;
  onOpenCitation: (c: Citation) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      data-role={message.role}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-[1.55] ${
          isUser
            ? "bg-accent text-white"
            : "bg-paper text-ink dark:bg-[#0f0f0f]"
        }`}
      >
        <RenderedContent
          text={message.content}
          citations={message.citations}
          onOpenCitation={onOpenCitation}
        />
        {message.isStreaming ? (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-current"
          />
        ) : null}
        {message.citations && message.citations.length > 0 ? (
          <SourcesBlock
            citations={message.citations}
            onOpen={onOpenCitation}
          />
        ) : null}
      </div>
    </div>
  );
}

// Renders assistant text with [chunk N] converted into superscript links.
// Falls back to plain text for user messages / general mode.
function RenderedContent({
  text,
  citations,
  onOpenCitation,
}: {
  text: string;
  citations: Citation[] | null;
  onOpenCitation: (c: Citation) => void;
}) {
  const cites = citations ?? [];
  if (cites.length === 0) {
    return <MarkdownText text={text} />;
  }

  // Replace [chunk N] with a placeholder token, split, then render.
  const parts: Array<{ kind: "text"; value: string } | { kind: "cite"; n: number }> = [];
  const re = /\[chunk\s+(\d+)\]/gi;
  let lastIndex = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      parts.push({ kind: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({ kind: "cite", n: Number(m[1]) });
    lastIndex = start + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return (
    <div className="space-y-2">
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <MarkdownText key={i} text={p.value} inline />
        ) : (
          <CitationChip
            key={i}
            n={p.n}
            citations={cites}
            onOpen={onOpenCitation}
          />
        ),
      )}
    </div>
  );
}

// Ultra-light markdown: paragraphs, bullets, `code`, **bold**. A full
// markdown renderer would be nicer but this keeps the bundle tight.
function MarkdownText({ text, inline }: { text: string; inline?: boolean }) {
  if (inline) {
    return <span>{applyInline(text)}</span>;
  }
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length > 0) {
      blocks.push(
        <ul
          key={`ul-${blocks.length}`}
          className="my-2 list-disc space-y-1 pl-5"
        >
          {listBuf.map((l, i) => (
            <li key={i}>{applyInline(l)}</li>
          ))}
        </ul>,
      );
      listBuf = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      listBuf.push(line.slice(2));
    } else if (line.startsWith("# ")) {
      flushList();
      blocks.push(
        <h3
          key={`h-${blocks.length}`}
          className="mt-3 font-serif text-[18px] leading-tight text-ink"
        >
          {applyInline(line.slice(2))}
        </h3>,
      );
    } else if (line === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${blocks.length}`} className="whitespace-pre-wrap">
          {applyInline(line)}
        </p>,
      );
    }
  }
  flushList();
  return <div className="space-y-2">{blocks}</div>;
}

function applyInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Bold + code — simple non-overlapping tokenizer.
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) nodes.push(text.slice(last, idx));
    const tok = m[0];
    if (tok.startsWith("**")) {
      nodes.push(
        <strong key={`b-${i++}`} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`c-${i++}`}
          className="rounded bg-ink/[0.06] px-1 py-0.5 font-mono text-[12.5px] dark:bg-white/[0.08]"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = idx + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function CitationChip({
  n,
  citations,
  onOpen,
}: {
  n: number;
  citations: Citation[];
  onOpen: (c: Citation) => void;
}) {
  const src = citations[n - 1];
  return (
    <button
      type="button"
      onClick={() => src && onOpen(src)}
      aria-label={
        src
          ? `Citation ${n}: ${src.materialName}${
              src.pageNumber ? `, page ${src.pageNumber}` : ""
            }`
          : `Citation ${n}`
      }
      className="mx-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent/15 px-1 align-super text-[10px] font-semibold text-accent hover:bg-accent/25"
    >
      {n}
    </button>
  );
}

function SourcesBlock({
  citations,
  onOpen,
}: {
  citations: Citation[];
  onOpen: (c: Citation) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-hairline bg-white/60 dark:border-white/10 dark:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-[11.5px] font-medium uppercase tracking-[0.14em] text-muted hover:text-ink"
      >
        {open ? (
          <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
        ) : (
          <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
        )}
        Sources · {citations.length}
      </button>
      {open ? (
        <ul className="space-y-2 border-t border-hairline px-3 py-3 dark:border-white/10">
          {citations.map((c, i) => (
            <li key={c.chunkId} className="text-[12.5px] leading-[1.5]">
              <p className="font-medium text-ink">
                <span className="mr-1 inline-block min-w-[16px] rounded bg-accent/15 px-1 text-center text-[10px] font-semibold text-accent">
                  {i + 1}
                </span>
                {c.materialName}
                {c.pageNumber ? (
                  <span className="text-muted"> · Page {c.pageNumber}</span>
                ) : null}
              </p>
              <p className="mt-1 line-clamp-2 text-muted">
                {c.textPreview}
                {c.textPreview.length >= 120 ? "…" : null}
              </p>
              <button
                type="button"
                onClick={() => onOpen(c)}
                className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent hover:opacity-80"
              >
                Open PDF{c.pageNumber ? ` at page ${c.pageNumber}` : ""} →
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ---------- Onboarding walkthrough ----------

function OnboardingWalkthrough({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Ask anything about your course.",
      body: "The tutor knows what you're learning — send a question in the box below.",
    },
    {
      title: "Answers are grounded in your materials.",
      body: "Uploaded PDFs are indexed. Every claim links back to the page it came from.",
    },
    {
      title: "Switch modes when you need to.",
      body: "General mode drops the course context if you want broader perspective.",
    },
  ];
  const s = steps[step]!;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Tutor walkthrough"
      className="fixed inset-0 z-[90] flex items-end justify-end p-6 md:p-8"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-hairline bg-white p-5 shadow-[0_30px_80px_-24px_rgb(10_10_10_/_0.45)] dark:bg-[#141414]">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/[0.10] px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-accent">
            <Sparkles size={11} strokeWidth={2} aria-hidden="true" />
            {step + 1} of {steps.length}
          </span>
          <button
            type="button"
            aria-label="Dismiss walkthrough"
            onClick={onDismiss}
            className="rounded-md p-1 text-muted hover:bg-ink/[0.04] hover:text-ink dark:hover:bg-white/[0.05]"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <h3 className="mt-3 font-serif text-[22px] leading-tight text-ink">
          {s.title}
        </h3>
        <p className="mt-2 text-[13.5px] leading-[1.5] text-muted">
          {s.body}
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#2e3fef] dark:hover:bg-[#6a7bff]"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#2e3fef] dark:hover:bg-[#6a7bff]"
            >
              <Check size={13} strokeWidth={2.5} aria-hidden="true" /> Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
