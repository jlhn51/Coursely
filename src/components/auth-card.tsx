"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";

/**
 * Wraps Clerk's <SignIn /> / <SignUp /> with our design tokens.
 * The `appearance.variables` values must be static strings (Clerk derives
 * shades from them), so we track the .dark class on <html> at runtime and
 * pass the right palette for the current theme.
 */

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getIsDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerIsDark(): boolean {
  return false;
}

const sharedVars = {
  fontFamily:
    "var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif",
  borderRadius: "0.5rem",
};

const lightVars = {
  ...sharedVars,
  colorPrimary: "#3B4CFF",
  colorBackground: "#FFFFFF",
  colorText: "#0A0A0A",
  colorTextSecondary: "#5A5A5A",
  colorInputBackground: "#FFFFFF",
  colorInputText: "#0A0A0A",
  colorNeutral: "#0A0A0A",
};

const darkVars = {
  ...sharedVars,
  colorPrimary: "#5A6BFF",
  colorBackground: "#141414",
  colorText: "#FAFAF7",
  colorTextSecondary: "#A0A0A0",
  colorInputBackground: "#0A0A0A",
  colorInputText: "#FAFAF7",
  colorNeutral: "#FAFAF7",
};

const elements = {
  rootBox: "w-full",
  card: "rounded-2xl border border-hairline bg-white shadow-[0_20px_50px_-20px_rgb(10_10_10_/_0.12)] dark:bg-[#141414] dark:shadow-[0_20px_50px_-20px_rgb(0_0_0_/_0.5)]",
  headerTitle:
    "font-serif tracking-tight",
  headerSubtitle: "text-muted",
  formButtonPrimary:
    "rounded-md text-[14px] font-medium normal-case transition-all duration-200 hover:-translate-y-px",
  formFieldInput: "rounded-md border-hairline",
  formFieldLabel: "text-ink",
  socialButtonsBlockButton:
    "rounded-md border border-hairline hover:bg-ink/[0.03] dark:hover:bg-white/[0.04]",
  footerActionLink: "text-accent hover:text-accent hover:opacity-80",
  identityPreviewEditButton: "text-accent hover:text-accent",
};

export function AuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isDark = useSyncExternalStore(subscribe, getIsDark, getServerIsDark);
  const appearance = {
    variables: isDark ? darkVars : lightVars,
    elements,
  };

  return mode === "sign-in" ? (
    <SignIn appearance={appearance} />
  ) : (
    <SignUp appearance={appearance} />
  );
}
