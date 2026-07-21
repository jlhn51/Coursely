"use client";

import { SignOutButton, useClerk, useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Sun,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { deleteAllData } from "@/actions/account";
import { Modal } from "@/components/modal";

type Profile = {
  name: string;
  email: string | null;
  imageUrl: string | null;
  initials: string;
  preferredName: string;
  clerkFirstName: string;
};

export function SettingsSections({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-4">
      <ProfileCard profile={profile} />
      <PreferredNameCard
        initial={profile.preferredName}
        fallback={profile.clerkFirstName}
      />
      <AppearanceCard />
      <NotificationsCard />
      <DangerZoneCard />
    </div>
  );
}

// ---------- Profile ----------

function ProfileCard({ profile }: { profile: Profile }) {
  const clerk = useClerk();
  return (
    <Section
      icon={UserIcon}
      label="Profile"
      description="Your identity across Coursely."
    >
      <div className="flex flex-wrap items-center gap-4">
        {profile.imageUrl ? (
          <Image
            src={profile.imageUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-full border border-hairline object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-accent/10 text-[14px] font-medium text-accent"
          >
            {profile.initials || "?"}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-serif text-[20px] leading-tight text-ink">
            {profile.name}
          </p>
          {profile.email ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
              <Mail size={11} strokeWidth={2} aria-hidden="true" />
              {profile.email}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">
        <button
          type="button"
          onClick={() => clerk.openUserProfile()}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#0f0f10] dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
        >
          Manage account
        </button>
      </div>
    </Section>
  );
}

// ---------- Preferred name ----------

function PreferredNameCard({
  initial,
  fallback,
}: {
  initial: string;
  fallback: string;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const savedValue =
    typeof user?.unsafeMetadata?.preferredName === "string"
      ? user.unsafeMetadata.preferredName.trim()
      : initial;
  const dirty = value.trim() !== savedValue;

  function onSave() {
    if (!user || !isLoaded) return;
    setError(null);
    startTransition(async () => {
      try {
        await user.update({
          unsafeMetadata: {
            ...(user.unsafeMetadata ?? {}),
            preferredName: value.trim(),
          },
        });
        setStatus("saved");
        router.refresh();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <Section
      icon={UserIcon}
      label="Preferred name"
      description="What Coursely calls you across the app. Overrides your account name."
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[220px]">
          <span className="sr-only">Preferred name</span>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus("idle");
            }}
            placeholder={fallback || "e.g. Alex"}
            maxLength={60}
            autoComplete="given-name"
            className="block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14.5px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
          />
        </label>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || pending || !isLoaded}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13.5px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-60 dark:hover:bg-[#6a7bff]"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="mt-2 text-[11.5px] text-muted">
        {status === "saved" && !dirty ? (
          <span className="text-accent">Saved. New greetings will use this name.</span>
        ) : error ? (
          <span className="text-red-600 dark:text-red-400">{error}</span>
        ) : fallback ? (
          <>Leave empty to fall back to &ldquo;{fallback}&rdquo;.</>
        ) : (
          "Leave empty and we'll call you 'there'."
        )}
      </p>
    </Section>
  );
}

// ---------- Appearance ----------

type Theme = "light" | "dark" | "system";

function AppearanceCard() {
  // Read the stored theme from localStorage on the client only; the server
  // render (and the first client render, pre-hydration) gets "system".
  const theme = useSyncExternalStore<Theme>(
    subscribeThemeStorage,
    readStoredTheme,
    () => "system",
  );

  function apply(next: Theme) {
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      /* silent */
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const wantsDark = next === "dark" || (next === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", wantsDark);
    // localStorage 'storage' events don't fire in the same tab; nudge the store.
    window.dispatchEvent(new Event("theme:change"));
  }

  return (
    <Section
      icon={Sun}
      label="Appearance"
      description="Match your system, or pick light and dark manually."
    >
      <div className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white p-0.5 dark:bg-[#0f0f10]">
        {(["light", "dark", "system"] as const).map((t) => {
          const active = theme === t;
          const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
          return (
            <button
              key={t}
              type="button"
              onClick={() => apply(t)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? "bg-accent text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Icon size={11} strokeWidth={2} aria-hidden="true" />
              {t}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* silent */
  }
  return "system";
}

function subscribeThemeStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener("theme:change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("theme:change", onChange);
  };
}

// ---------- Notifications ----------

function NotificationsCard() {
  const [checked, setChecked] = useState(false);
  return (
    <Section
      icon={Mail}
      label="Notifications"
      description="Stay ahead of what's due."
      soon
    >
      <label className="flex cursor-pointer items-center gap-3">
        <span className="text-[13.5px] text-ink">
          Email me about overdue tasks
        </span>
        <span
          className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
            checked
              ? "border-accent bg-accent"
              : "border-hairline bg-white dark:bg-[#0f0f10]"
          }`}
        >
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span
            aria-hidden="true"
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </label>
      <p className="mt-3 text-[11.5px] italic text-muted">
        Setting saved locally for now. Email delivery is coming soon.
      </p>
    </Section>
  );
}

// ---------- Danger zone ----------

function DangerZoneCard() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const r = await deleteAllData();
      if ("error" in r && r.error) {
        setError(r.error);
        return;
      }
      setConfirmOpen(false);
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <>
      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={13}
            strokeWidth={2}
            className="text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
          <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-red-700 dark:text-red-400">
            Danger zone
          </p>
        </div>
        <p className="mt-2 text-[14px] leading-[1.55] text-ink">
          Things you can&apos;t undo. Handle with care.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <SignOutButton>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#0f0f10] dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
            >
              <LogOut size={13} strokeWidth={2} aria-hidden="true" />
              Sign out
            </button>
          </SignOutButton>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-3.5 py-1.5 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:text-red-400"
          >
            <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
            Delete all my data
          </button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => (pending ? undefined : setConfirmOpen(false))}
        title="Delete all data?"
        eyebrow="Confirm"
      >
        <div className="space-y-4">
          <p className="text-[14px] leading-[1.55] text-ink">
            This soft-deletes every course, material, and task on your
            account. Are you sure?
          </p>
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[13px] text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-end gap-3 border-t border-hairline pt-4">
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
              className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete everything"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ---------- shared ----------

function Section({
  icon: Icon,
  label,
  description,
  soon,
  children,
}: {
  icon: typeof Sun;
  label: string;
  description: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-6 dark:bg-[#141414]">
      <div className="flex items-center gap-2">
        <Icon
          size={13}
          strokeWidth={2}
          className="text-accent"
          aria-hidden="true"
        />
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        {soon ? (
          <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">
            Coming soon
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[13.5px] text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
