"use client";

import { Toaster as SonnerToaster } from "sonner";

// Single global toaster mounted once at the root of every app route.
// Design system: rounded, hairline border, accent for successes, red for errors.
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      duration={4000}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "border border-hairline bg-white text-ink shadow-[0_20px_50px_-20px_rgb(10_10_10_/_0.25)] dark:bg-[#141414]",
          title: "text-[13.5px] font-medium",
          description: "text-[12.5px] text-muted",
          actionButton:
            "!bg-accent !text-white !rounded-md !px-3 !py-1 !text-[12.5px] !font-medium hover:!opacity-90",
          cancelButton:
            "!text-muted !text-[12.5px] hover:!text-ink",
          success: "!border-accent/30",
          error:
            "!border-red-500/40 !bg-red-500/[0.06] dark:!bg-red-500/[0.08]",
        },
      }}
    />
  );
}
