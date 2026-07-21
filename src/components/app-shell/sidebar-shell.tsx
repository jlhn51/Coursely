"use client";

import { UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SidebarNav } from "./sidebar-nav";

const STORAGE_KEY = "sidebar-collapsed";

// Reads pre-hydration state written by the inline script in RootLayout.
function readInitial(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.sidebar === "collapsed";
}

function applyToDOM(collapsed: boolean) {
  const root = document.documentElement;
  if (collapsed) root.dataset.sidebar = "collapsed";
  else delete root.dataset.sidebar;
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    /* silent */
  }
}

export function SidebarShell() {
  const [collapsed, setCollapsed] = useState<boolean>(readInitial);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      applyToDOM(next);
      return next;
    });
  }, []);

  // Cmd/Ctrl + \ toggles the sidebar (matches VS Code / Linear).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <SidebarNav collapsed={collapsed} />
      </div>

      {/* One user surface across the app: the sidebar footer mirrors the
          top-right avatar — same Clerk UserButton, same initial, same color.
          `showName` fills the strip when expanded; collapsed drops to just
          the avatar. */}
      <div
        className={`shrink-0 border-t border-hairline ${collapsed ? "px-2 py-2" : "px-3 py-3"}`}
      >
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}
          data-user-button-collapsed={collapsed ? "true" : "false"}
        >
          <UserButton
            showName={!collapsed}
            appearance={{
              elements: {
                rootBox: "w-full",
                userButtonBox: collapsed
                  ? "flex-row-reverse"
                  : "flex-row-reverse w-full justify-end gap-2",
                userButtonOuterIdentifier:
                  "text-[13px] font-medium text-ink truncate max-w-[140px]",
                avatarBox: "h-7 w-7",
              },
            }}
          />
        </div>
      </div>

      <div
        className={`shrink-0 border-t border-hairline py-2 ${collapsed ? "px-2" : "px-3"}`}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={
            collapsed
              ? "Expand sidebar (Cmd/Ctrl + \\)"
              : "Collapse sidebar (Cmd/Ctrl + \\)"
          }
          className={`flex w-full items-center rounded-md text-[12px] font-medium text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05] ${
            collapsed ? "justify-center py-2" : "gap-2 px-3 py-2"
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen size={14} strokeWidth={2} aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose size={14} strokeWidth={2} aria-hidden="true" />
              <span>Collapse</span>
              <kbd
                aria-hidden="true"
                className="ml-auto rounded border border-hairline bg-white px-1.5 py-0.5 text-[9.5px] font-medium text-muted dark:bg-[#0f0f0f]"
              >
                ⌘\
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
