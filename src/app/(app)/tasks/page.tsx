import { getUserCourses } from "@/actions/courses";
import { getUserTasks } from "@/actions/tasks";
import { TasksView, type GlobalTaskRow } from "./tasks-view";

export default async function TasksIndexPage() {
  const [tasks, courses] = await Promise.all([
    getUserTasks(500),
    getUserCourses(),
  ]);

  const rows: GlobalTaskRow[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    courseId: t.courseId,
    courseName: t.courseName,
    taskType: t.taskType,
    isCompleted: t.isCompleted,
    source: t.source,
    // Material name lookup is a v2 nicety — drawer falls back to "From
    // syllabus" when this is null.
    sourceMaterialName: null,
    dueDate: t.dueDate ? (t.dueDate as Date).toISOString() : null,
    createdAt: (t.createdAt as Date).toISOString(),
  }));

  return (
    <TasksView
      tasks={rows}
      courses={courses.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
