// Generic app-shell skeleton. Every (app) route fetches data on the server;
// this fills the shell while it does. Individual pages can override with
// their own loading.tsx if they want a more specific shape.
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-12 pb-24 md:pt-16 md:pb-32">
      <div className="animate-pulse">
        {/* Title bar */}
        <div className="h-4 w-24 rounded bg-hairline" />
        <div className="mt-4 h-12 w-72 max-w-full rounded bg-hairline md:h-16 md:w-96" />
        <div className="mt-4 h-4 w-96 max-w-full rounded bg-hairline" />

        {/* Cards row */}
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="min-h-[220px] rounded-2xl border border-hairline bg-white p-6 dark:bg-[#141414]"
            >
              <div className="h-3 w-16 rounded bg-hairline" />
              <div className="mt-6 h-12 w-24 rounded bg-hairline" />
              <div className="mt-3 h-3 w-32 rounded bg-hairline" />
              <div className="mt-8 h-3 w-full rounded bg-hairline" />
            </div>
          ))}
        </div>

        {/* Content list */}
        <div className="mt-14">
          <div className="h-8 w-40 rounded bg-hairline" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-hairline bg-white p-4 dark:bg-[#141414]"
              >
                <div className="h-5 w-5 shrink-0 rounded bg-hairline" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-hairline" />
                  <div className="h-3 w-1/3 rounded bg-hairline" />
                </div>
                <div className="h-3 w-14 shrink-0 rounded bg-hairline" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
