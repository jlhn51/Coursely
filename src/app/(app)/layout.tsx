import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserCourses } from "@/actions/courses";
import { getUserTasks } from "@/actions/tasks";
import { getUserMaterials } from "@/actions/materials";
import { AddMenu } from "@/components/app-shell/add-menu";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { KeyboardShortcutsHelp } from "@/components/app-shell/keyboard-shortcuts";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import {
  ParsingPill,
  ParsingProvider,
} from "@/components/app-shell/parsing-provider";
import { SearchBar } from "@/components/app-shell/search-bar";
import { SidebarShell } from "@/components/app-shell/sidebar-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { startOfDay } from "@/lib/dashboard";

// Auth is also enforced at the edge by the Clerk middleware in src/proxy.ts.
// Checking here too gives us `userId` for rendering and defence in depth.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [tasks, courses, materials] = await Promise.all([
    getUserTasks(200),
    getUserCourses(),
    getUserMaterials(100),
  ]);

  const t0 = startOfDay(new Date());
  const overdue = tasks
    .filter((t) => !t.isCompleted && t.dueDate && t.dueDate < t0)
    .map((t) => ({
      id: t.id,
      title: t.title,
      courseId: t.courseId,
      courseName: t.courseName,
      dueDate: (t.dueDate as Date).toISOString(),
    }));
  const courseOptions = courses.map((c) => ({ id: c.id, name: c.name }));
  const paletteTasks = tasks.slice(0, 100).map((t) => ({
    id: t.id,
    title: t.title,
    courseId: t.courseId,
    courseName: t.courseName,
  }));
  const paletteMaterials = materials.map((m) => ({
    id: m.id,
    name: m.name,
    courseId: m.courseId,
    courseName: m.courseName,
  }));

  return (
    <ParsingProvider>
      <div className="min-h-screen bg-paper">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-paper/85 px-4 backdrop-blur-md md:px-6">
          <MobileNav />
          <div className="flex items-center gap-2.5">
            <Wordmark href="/dashboard" size="sm" />
            <span className="hidden rounded-full border border-hairline px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.14em] text-muted sm:inline-block">
              Beta v0.1
            </span>
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <ParsingPill />
            <AddMenu courses={courseOptions} />
            <ThemeToggle />
            <NotificationBell overdue={overdue} />
            <UserButton
              appearance={{
                elements: { avatarBox: "h-8 w-8" },
              }}
            />
          </div>
        </header>

        <div className="flex">
          <aside className="sidebar-aside sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-hairline bg-white md:block dark:bg-[#0f0f0f]">
            <SidebarShell />
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
        <CommandPalette
          courses={courseOptions}
          tasks={paletteTasks}
          materials={paletteMaterials}
        />
        <KeyboardShortcutsHelp />
      </div>
    </ParsingProvider>
  );
}
