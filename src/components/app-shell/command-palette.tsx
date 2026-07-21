"use client";

import { Command } from "cmdk";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Plus,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NewTaskModal } from "@/components/app-shell/new-task-modal";
import { UploadMaterialModal } from "@/components/app-shell/upload-material-modal";
import type { CourseOption } from "@/components/course-picker";

type SearchItem = {
  id: string;
  label: string;
  hint: string;
  href: string;
  category: string;
  icon: LucideIcon;
};

// Ambient hover state so cmdk doesn't need to render its own results filtering
// text — we only surface icons + labels.

export function CommandPalette({
  courses,
  tasks,
  materials,
}: {
  courses: { id: string; name: string }[];
  tasks: { id: string; title: string; courseId: string; courseName: string }[];
  materials: {
    id: string;
    name: string;
    courseId: string;
    courseName: string;
  }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Cmd/Ctrl + K + external trigger from the search bar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const openHandler = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", openHandler);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", openHandler);
    };
  }, []);

  const courseItems: SearchItem[] = courses.map((c) => ({
    id: `course-${c.id}`,
    label: c.name,
    hint: "Course",
    href: `/courses/${c.id}`,
    category: "Courses",
    icon: BookOpen,
  }));
  const taskItems: SearchItem[] = tasks.slice(0, 10).map((t) => ({
    id: `task-${t.id}`,
    label: t.title,
    hint: t.courseName,
    href: `/courses/${t.courseId}#tasks`,
    category: "Tasks",
    icon: CheckSquare,
  }));
  const materialItems: SearchItem[] = materials.slice(0, 10).map((m) => ({
    id: `material-${m.id}`,
    label: m.name,
    hint: m.courseName,
    href: `/courses/${m.courseId}#materials`,
    category: "Materials",
    icon: FileText,
  }));

  function go(href: string) {
    close();
    router.push(href);
  }

  const hasCourses = courses.length > 0;

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
        >
          <button
            type="button"
            aria-label="Close command palette"
            onClick={close}
            className="fixed inset-0 bg-black/45 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_30px_80px_-24px_rgb(10_10_10_/_0.45)] dark:bg-[#141414]">
            <Command
              loop
              filter={(value, search) => {
                if (!search) return 1;
                return value.toLowerCase().includes(search.toLowerCase())
                  ? 1
                  : 0;
              }}
            >
              <div className="flex items-center gap-2 border-b border-hairline px-4">
                <Search
                  size={13}
                  strokeWidth={2}
                  className="text-muted"
                  aria-hidden="true"
                />
                <Command.Input
                  placeholder="Search or run a command…"
                  className="flex-1 bg-transparent py-3 text-[14px] text-ink placeholder:text-muted/70 focus:outline-none"
                />
                <kbd
                  aria-hidden="true"
                  className="rounded border border-hairline bg-white px-1.5 py-0.5 text-[10px] text-muted dark:bg-[#0f0f0f]"
                >
                  esc
                </kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-[13px] italic text-muted">
                  Nothing matches. Try another word.
                </Command.Empty>

                <Group label="Navigate">
                  <Item
                    icon={LayoutDashboard}
                    label="Dashboard"
                    onSelect={() => go("/dashboard")}
                  />
                  <Item
                    icon={BookOpen}
                    label="Courses"
                    onSelect={() => go("/courses")}
                  />
                  <Item
                    icon={Calendar}
                    label="Calendar"
                    onSelect={() => go("/calendar")}
                  />
                  <Item
                    icon={CheckSquare}
                    label="Tasks"
                    onSelect={() => go("/tasks")}
                  />
                  <Item
                    icon={FileText}
                    label="Materials"
                    onSelect={() => go("/materials")}
                  />
                  <Item
                    icon={Settings}
                    label="Settings"
                    onSelect={() => go("/settings")}
                  />
                </Group>

                <Group label="Actions">
                  <Item
                    icon={Plus}
                    label="New course"
                    onSelect={() => go("/courses/new")}
                  />
                  <Item
                    icon={Plus}
                    label="New task"
                    disabled={!hasCourses}
                    hint={hasCourses ? undefined : "Add a course first."}
                    onSelect={() => {
                      close();
                      setTaskModalOpen(true);
                    }}
                  />
                  <Item
                    icon={Upload}
                    label="Upload material"
                    disabled={!hasCourses}
                    hint={hasCourses ? undefined : "Add a course first."}
                    onSelect={() => {
                      close();
                      setUploadModalOpen(true);
                    }}
                  />
                </Group>

                {courseItems.length > 0 ? (
                  <Group label="Courses">
                    {courseItems.map((s) => (
                      <Item
                        key={s.id}
                        value={`${s.label} ${s.hint} ${s.category}`}
                        icon={s.icon}
                        label={s.label}
                        hint={s.hint}
                        onSelect={() => go(s.href)}
                      />
                    ))}
                  </Group>
                ) : null}

                {taskItems.length > 0 ? (
                  <Group label="Tasks">
                    {taskItems.map((s) => (
                      <Item
                        key={s.id}
                        value={`${s.label} ${s.hint} ${s.category}`}
                        icon={s.icon}
                        label={s.label}
                        hint={s.hint}
                        onSelect={() => go(s.href)}
                      />
                    ))}
                  </Group>
                ) : null}

                {materialItems.length > 0 ? (
                  <Group label="Materials">
                    {materialItems.map((s) => (
                      <Item
                        key={s.id}
                        value={`${s.label} ${s.hint} ${s.category}`}
                        icon={s.icon}
                        label={s.label}
                        hint={s.hint}
                        onSelect={() => go(s.href)}
                      />
                    ))}
                  </Group>
                ) : null}
              </Command.List>
            </Command>
          </div>
        </div>
      ) : null}

      <NewTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        courses={courses as CourseOption[]}
      />
      <UploadMaterialModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        courses={courses as CourseOption[]}
      />
    </>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Command.Group
      heading={
        <span className="px-2 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
      }
      className="mb-1"
    >
      {children}
    </Command.Group>
  );
}

function Item({
  icon: Icon,
  label,
  hint,
  onSelect,
  disabled,
  value,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onSelect: () => void;
  disabled?: boolean;
  value?: string;
}) {
  return (
    <Command.Item
      value={value ?? label}
      disabled={disabled}
      onSelect={disabled ? undefined : onSelect}
      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] ${
        disabled
          ? "cursor-not-allowed text-muted opacity-50"
          : "text-ink data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent"
      }`}
    >
      <Icon
        size={13}
        strokeWidth={2}
        aria-hidden="true"
        className="text-muted"
      />
      <span className="flex-1 truncate">{label}</span>
      {hint ? (
        <span className="shrink-0 text-[11px] text-muted">{hint}</span>
      ) : null}
    </Command.Item>
  );
}
