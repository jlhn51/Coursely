"use client";

import { Maximize2, Pause, Play, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { formatMMSS, useFocusSession } from "./focus-session-provider";

// Persistent compact widget for an active focus session. Rendered by the
// (app) layout so it stays alive across route changes. Hides itself on
// /focus (where the full overlay/landing lives).
export function FocusMiniWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    session,
    remainingSeconds,
    pause,
    resume,
    toggleAudioPlay,
    exit,
  } = useFocusSession();
  const [confirmExit, setConfirmExit] = useState(false);

  // Show the widget whenever a session is running AND the user isn't on
  // /focus (where the full overlay lives). No `minimized` flag — that
  // would fight the route change from the Minimize button.
  if (!session) return null;
  if (pathname?.startsWith("/focus")) return null;

  const isFocus = session.phase === "work";
  const phaseAccent = isFocus
    ? "border-l-accent"
    : "border-l-emerald-400";
  const phaseLabel = isFocus ? "Focus" : "Break";
  const phaseColor = isFocus
    ? "text-accent"
    : "text-emerald-500 dark:text-emerald-400";

  const handleExit = async () => {
    // If the user hasn't finished a cycle yet, ask before ending — we
    // never want to lose a session by an accidental click.
    if (!session.complete && session.completedCycles < 1) {
      setConfirmExit(true);
      return;
    }
    await exit();
  };

  const expand = () => {
    router.push("/focus");
  };

  return (
    <>
      <div
        role="dialog"
        aria-label="Focus session"
        className={`fixed bottom-4 right-4 z-[110] w-[280px] rounded-2xl border border-hairline border-l-4 bg-white shadow-[0_18px_50px_-16px_rgb(10_10_10_/_0.35)] transition-transform hover:-translate-y-0.5 max-md:inset-x-0 max-md:right-0 max-md:bottom-0 max-md:w-auto max-md:rounded-none max-md:border-x-0 max-md:border-b-0 max-md:border-t max-md:border-l-4 dark:bg-[#141414] ${phaseAccent}`}
      >
        <button
          type="button"
          onClick={expand}
          aria-label="Expand focus session"
          title="Expand focus session"
          className="grid w-full grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className={`text-[10.5px] font-medium uppercase tracking-[0.14em] ${phaseColor}`}
              >
                {phaseLabel}
              </p>
              <p className="text-[10.5px] text-muted">
                Cycle {Math.min(session.cycleIndex + 1, session.plannedCycles)}/
                {session.plannedCycles}
              </p>
            </div>
            <p className="mt-1 font-serif text-[22px] leading-none text-ink tabular-nums">
              {formatMMSS(remainingSeconds)}
            </p>
            {session.attachedTaskTitle ? (
              <p className="mt-1 truncate text-[11.5px] text-muted">
                {session.attachedTaskTitle}
              </p>
            ) : null}
          </div>
          <div
            className="flex shrink-0 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              label={session.running ? "Pause timer" : "Resume timer"}
              onClick={() => (session.running ? pause() : resume())}
            >
              {session.running ? (
                <Pause size={13} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <Play size={13} strokeWidth={2.5} aria-hidden="true" />
              )}
            </IconButton>
            <IconButton
              label={session.audioPlaying ? "Pause audio" : "Play audio"}
              onClick={() => void toggleAudioPlay()}
            >
              <AudioIcon
                playing={session.audioPlaying}
                muted={!session.audioUnlocked}
              />
            </IconButton>
            <IconButton label="Expand" onClick={expand}>
              <Maximize2 size={12} strokeWidth={2} aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Exit session"
              onClick={() => void handleExit()}
              tone="danger"
            >
              <X size={13} strokeWidth={2.5} aria-hidden="true" />
            </IconButton>
          </div>
        </button>
      </div>

      {confirmExit ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="End focus session"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-hairline bg-white p-6 shadow-2xl dark:bg-[#141414]">
            <h3 className="font-serif text-[22px] leading-tight text-ink">
              End this session?
            </h3>
            <p className="mt-2 text-[13.5px] text-muted">
              You haven&apos;t finished a full cycle yet. Ending now will save
              it as stopped early.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="rounded-md text-[13.5px] font-medium text-muted hover:text-ink"
              >
                Keep going
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmExit(false);
                  await exit();
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-[13.5px] font-medium text-white hover:bg-red-700"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function IconButton({
  label,
  onClick,
  children,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink/85 transition-colors hover:bg-ink/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.08] ${
        tone === "danger"
          ? "text-red-600 hover:bg-red-500/10 dark:text-red-400"
          : ""
      }`}
    >
      {children}
    </button>
  );
}

function AudioIcon({
  playing,
  muted,
}: {
  playing: boolean;
  muted: boolean;
}) {
  // Waveform ↔ crossed speaker. Two simple SVGs so we don't pull in more
  // lucide icons.
  if (muted || !playing) {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path d="M3 5v6h3l4 3V2L6 5H3z" fill="currentColor" fillOpacity="0.25" />
        <path d="M12 5l3 3M15 5l-3 3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2 8v0" />
      <path d="M5 6.5v3" />
      <path d="M8 4.5v7" />
      <path d="M11 6v4" />
      <path d="M14 7.5v1" />
    </svg>
  );
}
