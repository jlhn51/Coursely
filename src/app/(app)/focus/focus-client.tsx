"use client";

import {
  BarChart3,
  Check,
  Minimize2,
  Pause,
  Play,
  SkipForward,
  Timer as TimerIcon,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type AudioPrefs,
  type Preset,
  TRACKS,
  formatHMS,
  formatMMSS,
  sliderToVolume,
  useFocusSession,
} from "@/components/focus/focus-session-provider";
import { ThemeSelect } from "@/components/theme-select";

// ---------- Preset defs ----------

const PRESET_DEFS: Record<
  "25_5" | "50_10",
  { work: number; break: number; cycles: number; label: string; sub: string }
> = {
  "25_5": {
    work: 25 * 60,
    break: 5 * 60,
    cycles: 4,
    label: "Classic 25/5",
    sub: "25 min work · 5 min break · 4 cycles (2h total)",
  },
  "50_10": {
    work: 50 * 60,
    break: 10 * 60,
    cycles: 2,
    label: "Deep 50/10",
    sub: "50 min work · 10 min break · 2 cycles (2h total)",
  },
};

const LAST_PRESET_KEY = "focus-last-preset";

type Attach = { taskId: string | null; courseId: string | null };
type CourseOption = { id: string; name: string };
type TaskOption = {
  id: string;
  title: string;
  courseId: string;
  dueDate: string | null;
};

// ---------- Root ----------

export function FocusClient({
  courses,
  openTasks,
}: {
  courses: CourseOption[];
  openTasks: TaskOption[];
}) {
  const { session, restore } = useFocusSession();

  // If a session is already running (either fresh-started here or resumed
  // via widget expand), show the overlay. Otherwise show the landing.
  useEffect(() => {
    if (session && session.minimized) restore();
  }, [session, restore]);

  if (session) {
    return <FocusSessionOverlay />;
  }
  return <FocusLanding courses={courses} openTasks={openTasks} />;
}

// ---------- Landing state ----------

function FocusLanding({
  courses,
  openTasks,
}: {
  courses: CourseOption[];
  openTasks: TaskOption[];
}) {
  const { prefs, setPrefs, startSession } = useFocusSession();

  const [preset, setPresetState] = useState<Preset>(() => {
    if (typeof window === "undefined") return "25_5";
    try {
      const last = localStorage.getItem(LAST_PRESET_KEY) as Preset | null;
      if (last === "25_5" || last === "50_10" || last === "custom") return last;
    } catch {
      /* silent */
    }
    return "25_5";
  });
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [cycles, setCycles] = useState(4);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [attach, setAttach] = useState<Attach>({
    taskId: null,
    courseId: null,
  });

  const applyPreset = useCallback((p: Preset) => {
    setPresetState(p);
    try {
      localStorage.setItem(LAST_PRESET_KEY, p);
    } catch {
      /* silent */
    }
    if (p === "25_5") {
      setWorkMin(25);
      setBreakMin(5);
      setCycles(4);
    } else if (p === "50_10") {
      setWorkMin(50);
      setBreakMin(10);
      setCycles(2);
    }
  }, []);

  const derivedFromPreset = useMemo(() => {
    if (preset === "custom") {
      return {
        workSec: workMin * 60,
        breakSec: breakMin * 60,
        cycles,
        label: "Custom",
      };
    }
    const def = PRESET_DEFS[preset];
    return {
      workSec: def.work,
      breakSec: def.break,
      cycles: def.cycles,
      label: def.label,
    };
  }, [preset, workMin, breakMin, cycles]);

  const start = useCallback(async () => {
    const inferredCourseId =
      attach.courseId ??
      (attach.taskId
        ? openTasks.find((t) => t.id === attach.taskId)?.courseId ?? null
        : null);
    const attachedTaskTitle = attach.taskId
      ? openTasks.find((t) => t.id === attach.taskId)?.title ?? null
      : null;
    const r = await startSession({
      preset,
      workSec: derivedFromPreset.workSec,
      breakSec: derivedFromPreset.breakSec,
      plannedCycles: derivedFromPreset.cycles,
      autoAdvance,
      attachedTaskId: attach.taskId,
      attachedTaskTitle,
      attachedCourseId: inferredCourseId,
    });
    if ("error" in r) {
      toast.error("Couldn't start", { description: r.error });
    }
  }, [attach, autoAdvance, derivedFromPreset, openTasks, preset, startSession]);

  const subtitle = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Deep work while the day is fresh.";
    if (h < 17) return "Push through the middle.";
    return "One more session before you close the laptop.";
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 md:py-16">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
        Focus mode
      </p>
      <h1 className="mt-3 font-serif text-[52px] leading-[1.02] text-ink md:text-[68px]">
        Ready to <em className="italic text-accent">focus</em>.
      </h1>
      <p className="mt-5 max-w-xl text-[16px] leading-[1.55] text-muted">
        {subtitle}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
        <PresetTile
          selected={preset === "25_5"}
          onSelect={() => applyPreset("25_5")}
          label={PRESET_DEFS["25_5"].label}
          sub={PRESET_DEFS["25_5"].sub}
        />
        <PresetTile
          selected={preset === "50_10"}
          onSelect={() => applyPreset("50_10")}
          label={PRESET_DEFS["50_10"].label}
          sub={PRESET_DEFS["50_10"].sub}
        />
        <PresetTile
          selected={preset === "custom"}
          onSelect={() => applyPreset("custom")}
          label="Custom"
          sub="Configure everything yourself."
        />
      </div>

      {preset === "custom" ? (
        <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-hairline bg-white p-5 dark:bg-[#141414] md:grid-cols-4">
          <NumField
            label="Work (min)"
            min={15}
            max={120}
            value={workMin}
            onChange={setWorkMin}
          />
          <NumField
            label="Break (min)"
            min={3}
            max={30}
            value={breakMin}
            onChange={setBreakMin}
          />
          <NumField
            label="Cycles"
            min={1}
            max={8}
            value={cycles}
            onChange={setCycles}
          />
          <div>
            <label className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              Auto-advance
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={autoAdvance}
              onClick={() => setAutoAdvance(!autoAdvance)}
              className={`mt-2 inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12.5px] font-medium transition-colors ${
                autoAdvance
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-hairline bg-paper text-muted dark:bg-[#0f0f0f]"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  autoAdvance ? "bg-accent" : "bg-muted"
                }`}
                aria-hidden="true"
              />
              {autoAdvance ? "On" : "Off"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-white p-5 dark:bg-[#141414]">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
            Attach (optional)
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[11.5px] font-medium text-muted">
                Working on
              </label>
              <ThemeSelect
                className="mt-1"
                label="Working on"
                value={attach.taskId ?? ""}
                onChange={(v) => {
                  const taskId = v || null;
                  const inferredCourseId = taskId
                    ? openTasks.find((t) => t.id === taskId)?.courseId ?? null
                    : attach.courseId;
                  setAttach({ taskId, courseId: inferredCourseId });
                }}
                options={[
                  { value: "", label: "— No task —" },
                  ...openTasks.map((t) => ({ value: t.id, label: t.title })),
                ]}
              />
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-muted">
                Course
              </label>
              <ThemeSelect
                className="mt-1"
                label="Course"
                value={attach.courseId ?? ""}
                onChange={(v) =>
                  setAttach({ taskId: attach.taskId, courseId: v || null })
                }
                options={[
                  { value: "", label: "— No course —" },
                  ...courses.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-white p-5 dark:bg-[#141414]">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
            Ambient audio
          </p>
          <div className="mt-3 space-y-4">
            <div>
              <label className="text-[11.5px] font-medium text-muted">
                Study soundtrack
              </label>
              <ThemeSelect
                className="mt-1"
                label="Study soundtrack"
                value={prefs.trackId}
                onChange={(v) =>
                  setPrefs({ ...prefs, trackId: v as AudioPrefs["trackId"] })
                }
                options={TRACKS.map((t) => ({ value: t.id, label: t.label }))}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className="text-[12.5px] font-medium text-ink">
                Chime at phase transitions
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.chimesOn}
                onClick={() =>
                  setPrefs({ ...prefs, chimesOn: !prefs.chimesOn })
                }
                className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  prefs.chimesOn ? "bg-accent" : "bg-hairline"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    prefs.chimesOn ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <VolumeSlider prefs={prefs} setPrefs={setPrefs} />
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/focus/stats"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink"
        >
          <BarChart3 size={13} strokeWidth={2} aria-hidden="true" />
          View focus stats →
        </Link>
        <button
          type="button"
          onClick={() => void start()}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-[15px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_16px_40px_-12px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-[#6a7bff]"
        >
          <Play size={16} strokeWidth={2.5} aria-hidden="true" />
          Start
        </button>
      </div>
    </div>
  );
}

function PresetTile({
  selected,
  onSelect,
  label,
  sub,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-full flex-col rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        selected
          ? "border-accent/50 bg-accent/[0.06] shadow-[0_10px_24px_-16px_rgb(59_76_255_/_0.55)]"
          : "border-hairline bg-white hover:border-ink/25 dark:bg-[#141414]"
      }`}
    >
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
        <TimerIcon
          size={11}
          strokeWidth={2}
          className={selected ? "text-accent" : "text-muted"}
          aria-hidden="true"
        />
        Preset
      </span>
      <p className="mt-3 font-serif text-[24px] leading-tight text-ink">
        {label}
      </p>
      <p className="mt-2 text-[12.5px] leading-[1.5] text-muted">{sub}</p>
    </button>
  );
}

function NumField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) {
            onChange(Math.min(max, Math.max(min, n)));
          }
        }}
        className="mt-2 block w-full rounded-md border border-hairline bg-paper px-3 py-2 text-[14px] text-ink focus:border-accent/50 focus:outline-none dark:bg-[#0f0f0f]"
      />
    </div>
  );
}

function VolumeSlider({
  prefs,
  setPrefs,
}: {
  prefs: AudioPrefs;
  setPrefs: (p: AudioPrefs) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[11.5px] font-medium text-muted">
          Track volume
        </label>
        <span className="text-[11.5px] text-muted tabular-nums">
          {prefs.volume}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={prefs.volume}
        onChange={(e) =>
          setPrefs({ ...prefs, volume: Number(e.target.value) })
        }
        aria-label="Track volume"
        className="mt-2 w-full accent-accent"
      />
      <p className="mt-1 text-[11px] text-muted">
        Adjust your device volume for overall loudness.
      </p>
    </div>
  );
}

// ---------- Active session overlay ----------

function FocusSessionOverlay() {
  const router = useRouter();
  const {
    session,
    remainingSeconds,
    prefs,
    setPrefs,
    pause,
    resume,
    skip,
    minimize,
    exit,
    unlockAudio,
    toggleAudioPlay,
  } = useFocusSession();
  const [markDone, setMarkDone] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("focus-mode-active");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("focus-mode-active");
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!session) return null;

  const total =
    session.phase === "work" ? session.workSec : session.breakSec;
  const pct = Math.max(0, Math.min(1, 1 - remainingSeconds / total));
  const accentTone =
    session.phase === "work"
      ? "text-accent"
      : "text-emerald-500 dark:text-emerald-400";

  const showEnableAudio =
    !session.audioUnlocked &&
    session.running &&
    session.phase === "work" &&
    prefs.trackId !== "none";

  const handleExitClick = async () => {
    if (session.complete) return;
    await exit({ markTaskDone: false });
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0a0a0a] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="min-w-0">
          {session.attachedTaskTitle ? (
            <>
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/60">
                Working on
              </p>
              <p className="mt-0.5 truncate font-serif text-[18px] text-white/90">
                {session.attachedTaskTitle}
              </p>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ThemeSelect
            label="Study soundtrack"
            value={prefs.trackId}
            onChange={(v) =>
              setPrefs({ ...prefs, trackId: v as AudioPrefs["trackId"] })
            }
            options={TRACKS.map((t) => ({ value: t.id, label: t.label }))}
            triggerClassName="flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-white/85 hover:bg-white/[0.10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 min-w-[180px]"
            align="right"
          />
          <button
            type="button"
            aria-label={session.audioPlaying ? "Pause audio" : "Play audio"}
            title={session.audioPlaying ? "Pause audio" : "Play audio"}
            onClick={() => void toggleAudioPlay()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-white/80 hover:bg-white/[0.08]"
          >
            {session.audioPlaying && prefs.volume > 0 ? (
              <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
            ) : (
              <VolumeX size={14} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            aria-label="Minimize"
            title="Minimize (keep session running in the background)"
            onClick={() => {
              minimize();
              router.push("/dashboard");
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-white/85 hover:bg-white/[0.08]"
          >
            <Minimize2 size={14} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => void handleExitClick()}
            aria-label="Exit focus mode"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-[12.5px] font-medium text-white/85 hover:bg-white/[0.08]"
          >
            <X size={13} strokeWidth={2} aria-hidden="true" />
            Exit
          </button>
        </div>
      </div>

      {/* Center */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <p
          className={`text-[11px] font-medium uppercase tracking-[0.2em] ${accentTone}`}
        >
          {session.phase === "work" ? "Focus" : "Break"}
        </p>
        <p className="mt-4 font-serif text-[112px] leading-none text-white md:text-[144px] tabular-nums">
          {formatMMSS(remainingSeconds)}
        </p>
        <p className="mt-4 text-[12.5px] text-white/60">
          Cycle {Math.min(session.cycleIndex + 1, session.plannedCycles)} of{" "}
          {session.plannedCycles}
        </p>
        <div className="mt-6 h-1 w-64 max-w-[60vw] overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full ${
              session.phase === "work" ? "bg-accent" : "bg-emerald-400"
            } transition-[width] duration-500 ease-out`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-3 pb-10">
        <button
          type="button"
          onClick={() => (session.running ? pause() : resume())}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-5 py-2 text-[13.5px] font-medium text-white hover:bg-white/[0.10]"
        >
          {session.running ? (
            <>
              <Pause size={14} strokeWidth={2.5} aria-hidden="true" /> Pause
            </>
          ) : (
            <>
              <Play size={14} strokeWidth={2.5} aria-hidden="true" /> Resume
            </>
          )}
        </button>
        <button
          type="button"
          onClick={skip}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-5 py-2 text-[13.5px] font-medium text-white hover:bg-white/[0.10]"
        >
          <SkipForward size={14} strokeWidth={2.5} aria-hidden="true" /> Skip
        </button>
      </div>

      {/* Autoplay-blocked prompt */}
      {showEnableAudio ? (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-[12.5px] backdrop-blur">
          <button
            type="button"
            onClick={() => void unlockAudio()}
            className="inline-flex items-center gap-2 text-white hover:opacity-80"
          >
            Click to enable audio
          </button>
        </div>
      ) : null}

      {session.complete ? (
        <CompleteModal
          totalWork={session.totalWork}
          totalBreak={session.totalBreak}
          completedCycles={session.completedCycles}
          cycles={session.plannedCycles}
          attachedTaskTitle={session.attachedTaskTitle}
          markDone={markDone}
          setMarkDone={setMarkDone}
          volume={sliderToVolume(prefs.volume)}
          onDone={async (again) => {
            await exit({
              markTaskDone: Boolean(session.attachedTaskTitle) && markDone,
            });
            if (again) {
              // Land back on the focus route so the landing state shows.
              router.replace("/focus");
            } else {
              router.push("/dashboard");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function CompleteModal({
  totalWork,
  totalBreak,
  completedCycles,
  cycles,
  attachedTaskTitle,
  markDone,
  setMarkDone,
  onDone,
  volume,
}: {
  totalWork: number;
  totalBreak: number;
  completedCycles: number;
  cycles: number;
  attachedTaskTitle: string | null;
  markDone: boolean;
  setMarkDone: (b: boolean) => void;
  onDone: (again: boolean) => Promise<void>;
  // Reserved for a future celebratory sound; kept in signature so we don't
  // need to break the API when we add it.
  volume: number;
}) {
  void volume;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 text-white shadow-[0_30px_80px_-24px_rgb(0_0_0_/_0.7)]">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/60">
          Focus mode
        </p>
        <h3 className="mt-3 font-serif text-[32px] leading-tight text-white">
          Session complete.
        </h3>
        <dl className="mt-5 grid grid-cols-3 gap-3">
          <StatBox label="Focus" value={formatHMS(totalWork)} />
          <StatBox label="Break" value={formatHMS(totalBreak)} />
          <StatBox
            label="Cycles"
            value={`${completedCycles} / ${cycles}`}
          />
        </dl>
        {attachedTaskTitle ? (
          <label className="mt-5 flex items-center gap-2 text-[13.5px] text-white/90">
            <input
              type="checkbox"
              checked={markDone}
              onChange={(e) => setMarkDone(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/[0.06] accent-accent"
            />
            Mark <span className="font-medium">{attachedTaskTitle}</span> as
            done
          </label>
        ) : null}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void onDone(false)}
            className="rounded-md border border-white/15 bg-white/[0.06] px-4 py-2 text-[13.5px] font-medium text-white/90 hover:bg-white/[0.10]"
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => void onDone(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13.5px] font-medium text-white hover:bg-[#2e3fef] dark:hover:bg-[#6a7bff]"
          >
            <Check size={13} strokeWidth={2.5} aria-hidden="true" /> Start
            another
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/60">
        {label}
      </p>
      <p className="mt-1 font-serif text-[20px] leading-tight text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}
