"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  createFocusSession,
  updateFocusSession,
} from "@/actions/focus";
import { toggleTaskCompletion } from "@/actions/tasks";

// One home for everything the focus session needs to stay alive across
// route changes. Lives at the (app) layout so the audio elements don't get
// unmounted when the user navigates from /focus to /courses/[id]/tutor.

// ---------- Types ----------

export type Preset = "25_5" | "50_10" | "custom";
export type Phase = "work" | "break";

export const TRACKS = [
  {
    id: "lofi-study-peaceful",
    label: "Lofi Study Peaceful",
    file: "/audio/lofi-study-peaceful.mp3",
  },
  {
    id: "study-lofi-music",
    label: "Study Lofi Music",
    file: "/audio/study-lofi-music.mp3",
  },
  { id: "coffee-shop", label: "Coffee Shop", file: "/audio/coffee-shop.mp3" },
  {
    id: "ambient-piano",
    label: "Ambient Piano",
    file: "/audio/ambient-piano.mp3",
  },
  {
    id: "ambient-electronica",
    label: "Ambient Electronica",
    file: "/audio/ambient-electronica.mp3",
  },
  { id: "none", label: "None (silence)", file: null },
] as const;

export type TrackId = (typeof TRACKS)[number]["id"];

export type AudioPrefs = {
  trackId: TrackId;
  chimesOn: boolean;
  volume: number; // 0-100, linear slider position
};

export const DEFAULT_PREFS: AudioPrefs = {
  trackId: "lofi-study-peaceful",
  chimesOn: true,
  volume: 50,
};

export type StartArgs = {
  preset: Preset;
  workSec: number;
  breakSec: number;
  plannedCycles: number;
  autoAdvance: boolean;
  attachedTaskId: string | null;
  attachedTaskTitle: string | null;
  attachedCourseId: string | null;
};

export type ActiveSession = {
  sessionId: string;
  preset: Preset;
  workSec: number;
  breakSec: number;
  plannedCycles: number;
  autoAdvance: boolean;

  phase: Phase;
  cycleIndex: number; // 0-based work block currently in progress
  completedCycles: number;
  totalWork: number;
  totalBreak: number;
  complete: boolean;
  running: boolean;

  // Wall-clock timeline. Everything remaining/elapsed derives from these
  // so a backgrounded tab (or route change) doesn't drift the timer.
  phaseEndsAt: number; // ms epoch; only meaningful when running
  pausedRemaining: number | null; // ms; set when paused, resumes into phaseEndsAt

  minimized: boolean;

  attachedTaskId: string | null;
  attachedTaskTitle: string | null;
  attachedCourseId: string | null;

  // Audio side.
  audioUnlocked: boolean;
  audioPlaying: boolean;
};

// ---------- Storage keys ----------

const AUDIO_PREFS_KEY = "focus-audio-preferences";
const AUDIO_UNLOCKED_KEY = "focus-audio-unlocked";

// ---------- Prefs helpers ----------

function readPrefs(): AudioPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(AUDIO_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      trackId: (TRACKS.find((t) => t.id === parsed.trackId)?.id ??
        DEFAULT_PREFS.trackId) as TrackId,
      chimesOn:
        typeof parsed.chimesOn === "boolean"
          ? parsed.chimesOn
          : DEFAULT_PREFS.chimesOn,
      volume:
        typeof parsed.volume === "number"
          ? Math.min(100, Math.max(0, parsed.volume))
          : DEFAULT_PREFS.volume,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(p: AudioPrefs) {
  try {
    localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(p));
  } catch {
    /* silent */
  }
}

function readUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(AUDIO_UNLOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeUnlocked(v: boolean) {
  try {
    if (v) sessionStorage.setItem(AUDIO_UNLOCKED_KEY, "1");
    else sessionStorage.removeItem(AUDIO_UNLOCKED_KEY);
  } catch {
    /* silent */
  }
}

// Perceptual volume curve — spec Part 2B: audio = (slider/100)^2.
export function sliderToVolume(slider: number): number {
  const clamped = Math.min(100, Math.max(0, slider)) / 100;
  return clamped * clamped;
}

// ---------- Reducer ----------

type State = {
  session: ActiveSession | null;
  // Queue of side-effects the effect that drains chimes will play. Kept in
  // state so a single reducer transition can request multiple chimes.
  chimeQueue: Array<"work" | "break" | "session-end">;
};

type Action =
  | { type: "start"; session: ActiveSession }
  | { type: "tick"; now: number }
  | { type: "pause" }
  | { type: "resume"; now: number }
  | { type: "skip"; now: number }
  | { type: "minimize" }
  | { type: "restore" }
  | { type: "audio-unlock" }
  | { type: "audio-playing-changed"; playing: boolean }
  | { type: "clear-chimes" }
  | { type: "end" };

function stepPhase(s: ActiveSession, now: number): {
  next: ActiveSession;
  chimes: Array<"work" | "break" | "session-end">;
} {
  if (s.complete) return { next: s, chimes: [] };
  if (s.phase === "work") {
    const nextCompleted = s.completedCycles + 1;
    if (nextCompleted >= s.plannedCycles) {
      return {
        next: {
          ...s,
          completedCycles: nextCompleted,
          complete: true,
          running: false,
          audioPlaying: false,
          pausedRemaining: null,
        },
        chimes: ["session-end"],
      };
    }
    const shouldRun = s.autoAdvance;
    return {
      next: {
        ...s,
        phase: "break",
        completedCycles: nextCompleted,
        running: shouldRun,
        phaseEndsAt: shouldRun ? now + s.breakSec * 1000 : 0,
        pausedRemaining: shouldRun ? null : s.breakSec * 1000,
      },
      chimes: ["break"],
    };
  }
  // break → work
  const shouldRun = s.autoAdvance;
  return {
    next: {
      ...s,
      phase: "work",
      cycleIndex: s.cycleIndex + 1,
      running: shouldRun,
      phaseEndsAt: shouldRun ? now + s.workSec * 1000 : 0,
      pausedRemaining: shouldRun ? null : s.workSec * 1000,
    },
    chimes: ["work"],
  };
}

function currentPhaseDurationMs(s: ActiveSession): number {
  return (s.phase === "work" ? s.workSec : s.breakSec) * 1000;
}

function reducer(state: State, action: Action): State {
  const s = state.session;

  switch (action.type) {
    case "start":
      return { session: action.session, chimeQueue: [] };

    case "tick": {
      if (!s || s.complete) return state;
      if (!s.running) return state;
      // Time up? Advance the phase.
      if (action.now >= s.phaseEndsAt) {
        // Bring totals up to date first (whole current phase counted).
        const totalMs = currentPhaseDurationMs(s);
        const fullPhaseSeconds = Math.floor(totalMs / 1000);
        const catchUp: ActiveSession = {
          ...s,
          totalWork:
            s.phase === "work" ? s.totalWork + fullPhaseSeconds : s.totalWork,
          totalBreak:
            s.phase === "break"
              ? s.totalBreak + fullPhaseSeconds
              : s.totalBreak,
        };
        const { next, chimes } = stepPhase(catchUp, action.now);
        return {
          session: next,
          chimeQueue: [...state.chimeQueue, ...chimes],
        };
      }
      // Otherwise the UI recomputes `remainingSeconds` from wall clock on
      // every render — no state change needed for the tick itself.
      return state;
    }

    case "pause": {
      if (!s || s.complete || !s.running) return state;
      const now = Date.now();
      const remainingMs = Math.max(0, s.phaseEndsAt - now);
      // Fold elapsed seconds into totals so /focus/stats stays accurate
      // even if the session never resumes.
      const elapsedSec = Math.floor(
        (currentPhaseDurationMs(s) - remainingMs) / 1000,
      );
      return {
        ...state,
        session: {
          ...s,
          running: false,
          pausedRemaining: remainingMs,
          totalWork:
            s.phase === "work" ? s.totalWork + elapsedSec : s.totalWork,
          totalBreak:
            s.phase === "break" ? s.totalBreak + elapsedSec : s.totalBreak,
          // Reset the "phase start" so post-resume elapsed math doesn't
          // double-count the seconds we just folded in.
          phaseEndsAt: 0,
        },
      };
    }

    case "resume": {
      if (!s || s.complete || s.running) return state;
      const remainingMs =
        s.pausedRemaining ?? currentPhaseDurationMs(s);
      return {
        ...state,
        session: {
          ...s,
          running: true,
          phaseEndsAt: action.now + remainingMs,
          pausedRemaining: null,
        },
      };
    }

    case "skip": {
      if (!s || s.complete) return state;
      // Count whatever ran so far, then advance.
      const now = action.now;
      let elapsedSec: number;
      if (s.running) {
        const remainingMs = Math.max(0, s.phaseEndsAt - now);
        elapsedSec = Math.floor(
          (currentPhaseDurationMs(s) - remainingMs) / 1000,
        );
      } else if (s.pausedRemaining !== null) {
        elapsedSec = 0; // pause already folded elapsed in
      } else {
        elapsedSec = 0;
      }
      const withCatchUp: ActiveSession = {
        ...s,
        totalWork:
          s.phase === "work" ? s.totalWork + elapsedSec : s.totalWork,
        totalBreak:
          s.phase === "break" ? s.totalBreak + elapsedSec : s.totalBreak,
      };
      const { next, chimes } = stepPhase(withCatchUp, now);
      return {
        session: next,
        chimeQueue: [...state.chimeQueue, ...chimes],
      };
    }

    case "minimize":
      if (!s) return state;
      return { ...state, session: { ...s, minimized: true } };

    case "restore":
      if (!s) return state;
      return { ...state, session: { ...s, minimized: false } };

    case "audio-unlock":
      if (!s) return state;
      return {
        ...state,
        session: { ...s, audioUnlocked: true, audioPlaying: true },
      };

    case "audio-playing-changed":
      if (!s) return state;
      return { ...state, session: { ...s, audioPlaying: action.playing } };

    case "clear-chimes":
      if (state.chimeQueue.length === 0) return state;
      return { ...state, chimeQueue: [] };

    case "end":
      return { session: null, chimeQueue: [] };
  }
}

// ---------- Context ----------

export type FocusSessionContextValue = {
  session: ActiveSession | null;
  prefs: AudioPrefs;
  setPrefs: (p: AudioPrefs) => void;

  // Derived: remaining seconds in the current phase (wall-clock based).
  remainingSeconds: number;

  startSession: (args: StartArgs) => Promise<{ ok: true } | { error: string }>;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  exit: (options?: { markTaskDone?: boolean }) => Promise<void>;
  minimize: () => void;
  restore: () => void;
  unlockAudio: () => Promise<void>;
  toggleAudioPlay: () => Promise<void>;
};

const FocusSessionContext = createContext<FocusSessionContextValue | null>(null);

export function useFocusSession(): FocusSessionContextValue {
  const ctx = useContext(FocusSessionContext);
  if (!ctx) {
    throw new Error(
      "useFocusSession must be used inside <FocusSessionProvider>.",
    );
  }
  return ctx;
}

// ---------- Provider ----------

const CROSSFADE_MS = 500;

export function FocusSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setPrefsState] = useState<AudioPrefs>(() =>
    typeof window === "undefined" ? DEFAULT_PREFS : readPrefs(),
  );
  const setPrefs = useCallback((p: AudioPrefs) => {
    setPrefsState(p);
    writePrefs(p);
  }, []);

  const [state, dispatch] = useReducer(reducer, {
    session: null,
    chimeQueue: [],
  });
  const { session, chimeQueue } = state;

  // Track when the audio was unlocked ever this browser session — if the
  // user starts a second session in the same tab, we skip the "Click to
  // enable audio" prompt because the gesture-lock is already broken.
  const alreadyUnlockedThisTab = useRef<boolean>(false);
  useEffect(() => {
    alreadyUnlockedThisTab.current = readUnlocked();
  }, []);

  // ----- Audio elements (mounted once at the layout level) -----
  const musicA = useRef<HTMLAudioElement | null>(null);
  const musicB = useRef<HTMLAudioElement | null>(null);
  const activeSlot = useRef<"A" | "B">("A");
  const chimeBreak = useRef<HTMLAudioElement | null>(null);
  const chimeWork = useRef<HTMLAudioElement | null>(null);
  const chimeEnd = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<TrackId | null>(null);
  const targetVolumeRef = useRef<number>(sliderToVolume(prefs.volume));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (musicA.current) return;
    musicA.current = new Audio();
    musicA.current.loop = true;
    musicA.current.preload = "auto";
    musicA.current.volume = 0;
    musicB.current = new Audio();
    musicB.current.loop = true;
    musicB.current.preload = "auto";
    musicB.current.volume = 0;
    chimeBreak.current = new Audio("/audio/break-chime.mp3");
    chimeBreak.current.preload = "auto";
    chimeWork.current = new Audio("/audio/break-chime.mp3");
    chimeWork.current.preload = "auto";
    chimeEnd.current = new Audio("/audio/session-end.mp3");
    chimeEnd.current.preload = "auto";
  }, []);

  // Keep the audio engine's live volume in sync with prefs.
  useEffect(() => {
    const v = sliderToVolume(prefs.volume);
    targetVolumeRef.current = v;
    const active =
      activeSlot.current === "A" ? musicA.current : musicB.current;
    if (active && !active.paused) active.volume = v;
  }, [prefs.volume]);

  // ----- Music engine imperatives -----

  const stopMusic = useCallback(() => {
    musicA.current?.pause();
    musicB.current?.pause();
  }, []);

  const playMusic = useCallback(
    async (trackId: TrackId) => {
      if (!musicA.current || !musicB.current) return;
      const track = TRACKS.find((t) => t.id === trackId);
      if (!track || !track.file) {
        stopMusic();
        currentTrackRef.current = null;
        return;
      }

      const active =
        activeSlot.current === "A" ? musicA.current : musicB.current;
      const other =
        activeSlot.current === "A" ? musicB.current : musicA.current;
      const target = targetVolumeRef.current;

      if (currentTrackRef.current === trackId) {
        try {
          if (active.paused) {
            active.volume = target;
            await active.play();
          } else {
            active.volume = target;
          }
          dispatch({ type: "audio-playing-changed", playing: true });
        } catch {
          dispatch({ type: "audio-playing-changed", playing: false });
          throw new AutoplayBlockedError();
        }
        return;
      }

      other.src = track.file;
      other.currentTime = 0;
      other.volume = 0;
      try {
        await other.play();
      } catch {
        dispatch({ type: "audio-playing-changed", playing: false });
        throw new AutoplayBlockedError();
      }
      const startWall = performance.now();
      const startVolActive = active.volume;
      const step = () => {
        const t = Math.min(1, (performance.now() - startWall) / CROSSFADE_MS);
        active.volume = startVolActive * (1 - t);
        other.volume = target * t;
        if (t < 1) requestAnimationFrame(step);
        else {
          active.pause();
          activeSlot.current = activeSlot.current === "A" ? "B" : "A";
          currentTrackRef.current = trackId;
        }
      };
      requestAnimationFrame(step);
      dispatch({ type: "audio-playing-changed", playing: true });
    },
    [stopMusic],
  );

  const playChime = useCallback(
    (kind: "break" | "work" | "session-end") => {
      if (!prefs.chimesOn) return;
      const ref =
        kind === "session-end"
          ? chimeEnd.current
          : kind === "break"
            ? chimeBreak.current
            : chimeWork.current;
      if (!ref) return;
      try {
        ref.volume = targetVolumeRef.current;
        ref.currentTime = 0;
        void ref.play();
      } catch {
        /* chimes are non-critical */
      }
    },
    [prefs.chimesOn],
  );

  // Drain queued chimes after commit.
  useEffect(() => {
    if (chimeQueue.length === 0) return;
    for (const c of chimeQueue) playChime(c);
    dispatch({ type: "clear-chimes" });
  }, [chimeQueue, playChime]);

  // Play/stop music in response to running + phase state.
  useEffect(() => {
    if (!session) {
      stopMusic();
      return;
    }
    if (session.running && session.phase === "work") {
      playMusic(prefs.trackId).catch(() => {
        // Autoplay blocked; UI shows the "Click to enable audio" prompt.
      });
    } else {
      stopMusic();
      dispatch({ type: "audio-playing-changed", playing: false });
    }
  }, [
    session?.running,
    session?.phase,
    session?.sessionId,
    prefs.trackId,
    playMusic,
    stopMusic,
    session,
  ]);

  // ----- Wall-clock ticker -----

  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!session || !session.running || session.complete) return;
    const t = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(t);
  }, [session?.running, session?.complete, session]);

  // On each tick, ask the reducer whether the current phase has elapsed.
  useEffect(() => {
    if (!session || !session.running || session.complete) return;
    dispatch({ type: "tick", now: nowTick });
  }, [nowTick, session]);

  const remainingSeconds = useMemo(() => {
    if (!session) return 0;
    if (session.complete) return 0;
    if (!session.running) {
      const paused = session.pausedRemaining ?? currentPhaseDurationMs(session);
      return Math.max(0, Math.ceil(paused / 1000));
    }
    return Math.max(0, Math.ceil((session.phaseEndsAt - nowTick) / 1000));
  }, [session, nowTick]);

  // ----- Server checkpoints -----

  // Periodic every 15s while running.
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      const s = session;
      void updateFocusSession({
        sessionId: s.sessionId,
        completedCycles: s.completedCycles,
        totalWorkSeconds: s.totalWork,
        totalBreakSeconds: s.totalBreak,
      });
    }, 15_000);
    return () => clearInterval(interval);
  }, [session]);

  // On natural completion, finalize + toast.
  const finalizeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session || !session.complete) return;
    if (finalizeRef.current === session.sessionId) return;
    finalizeRef.current = session.sessionId;
    void updateFocusSession({
      sessionId: session.sessionId,
      completedCycles: session.completedCycles,
      totalWorkSeconds: session.totalWork,
      totalBreakSeconds: session.totalBreak,
      status: "completed",
      ended: true,
    });
  }, [session?.complete, session]);

  // ----- Actions -----

  const startSession = useCallback(
    async (args: StartArgs): Promise<{ ok: true } | { error: string }> => {
      const r = await createFocusSession({
        presetType: args.preset,
        workDuration: args.workSec,
        breakDuration: args.breakSec,
        plannedCycles: args.plannedCycles,
        courseId: args.attachedCourseId,
        taskId: args.attachedTaskId,
      });
      if (!r.success) return { error: r.error };
      const now = Date.now();
      dispatch({
        type: "start",
        session: {
          sessionId: r.sessionId,
          preset: args.preset,
          workSec: args.workSec,
          breakSec: args.breakSec,
          plannedCycles: args.plannedCycles,
          autoAdvance: args.autoAdvance,
          phase: "work",
          cycleIndex: 0,
          completedCycles: 0,
          totalWork: 0,
          totalBreak: 0,
          complete: false,
          running: true,
          phaseEndsAt: now + args.workSec * 1000,
          pausedRemaining: null,
          minimized: false,
          attachedTaskId: args.attachedTaskId,
          attachedTaskTitle: args.attachedTaskTitle,
          attachedCourseId: args.attachedCourseId,
          audioUnlocked: alreadyUnlockedThisTab.current,
          audioPlaying: false,
        },
      });
      finalizeRef.current = null;
      return { ok: true };
    },
    [],
  );

  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const resume = useCallback(
    () => dispatch({ type: "resume", now: Date.now() }),
    [],
  );
  const skip = useCallback(
    () => dispatch({ type: "skip", now: Date.now() }),
    [],
  );
  const minimize = useCallback(() => dispatch({ type: "minimize" }), []);
  const restore = useCallback(() => dispatch({ type: "restore" }), []);

  const unlockAudio = useCallback(async () => {
    // A user gesture unlocks autoplay; kick off the current track and mark
    // the tab-scoped unlock so this doesn't nag again.
    writeUnlocked(true);
    alreadyUnlockedThisTab.current = true;
    dispatch({ type: "audio-unlock" });
    if (session) {
      try {
        await playMusic(prefs.trackId);
      } catch {
        /* still blocked — user can tap again */
      }
    }
  }, [playMusic, prefs.trackId, session]);

  const toggleAudioPlay = useCallback(async () => {
    if (!session) return;
    const active =
      activeSlot.current === "A" ? musicA.current : musicB.current;
    if (!active) return;
    if (active.paused) {
      try {
        await playMusic(prefs.trackId);
        dispatch({ type: "audio-playing-changed", playing: true });
      } catch {
        /* still blocked */
      }
    } else {
      stopMusic();
      dispatch({ type: "audio-playing-changed", playing: false });
    }
  }, [playMusic, prefs.trackId, session, stopMusic]);

  const exit = useCallback(
    async (options?: { markTaskDone?: boolean }) => {
      const s = session;
      if (!s) return;
      // If they never completed a cycle, mark abandoned; otherwise
      // completed.
      const status =
        s.complete || s.completedCycles >= 1 ? "completed" : "abandoned";
      // Fold any in-flight elapsed into totals before we save.
      let extraWork = 0;
      let extraBreak = 0;
      if (!s.complete) {
        if (s.running) {
          const remainingMs = Math.max(0, s.phaseEndsAt - Date.now());
          const elapsedSec = Math.floor(
            (currentPhaseDurationMs(s) - remainingMs) / 1000,
          );
          if (s.phase === "work") extraWork = elapsedSec;
          else extraBreak = elapsedSec;
        }
      }
      stopMusic();
      await updateFocusSession({
        sessionId: s.sessionId,
        completedCycles: s.completedCycles,
        totalWorkSeconds: s.totalWork + extraWork,
        totalBreakSeconds: s.totalBreak + extraBreak,
        status,
        ended: true,
      });
      if (options?.markTaskDone && s.attachedTaskId) {
        const r = await toggleTaskCompletion({ taskId: s.attachedTaskId });
        if ("error" in r && r.error) {
          toast.error("Couldn't mark task done", { description: r.error });
        } else {
          toast.success("Task marked done");
        }
      }
      dispatch({ type: "end" });
    },
    [session, stopMusic],
  );

  const value = useMemo<FocusSessionContextValue>(
    () => ({
      session,
      prefs,
      setPrefs,
      remainingSeconds,
      startSession,
      pause,
      resume,
      skip,
      exit,
      minimize,
      restore,
      unlockAudio,
      toggleAudioPlay,
    }),
    [
      session,
      prefs,
      setPrefs,
      remainingSeconds,
      startSession,
      pause,
      resume,
      skip,
      exit,
      minimize,
      restore,
      unlockAudio,
      toggleAudioPlay,
    ],
  );

  return (
    <FocusSessionContext.Provider value={value}>
      {children}
    </FocusSessionContext.Provider>
  );
}

// Thrown by playMusic when the browser refuses autoplay. Callers should
// catch it silently — the UI surfaces the "Click to enable audio" prompt
// off the audioUnlocked flag.
export class AutoplayBlockedError extends Error {
  constructor() {
    super("Autoplay blocked");
  }
}

// ---------- Helpers exported for the UI ----------

export function formatMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHMS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
