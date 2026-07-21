import { getUserTasks } from "@/actions/tasks";
import { CalendarView, type CalendarTask } from "./calendar-view";

export default async function CalendarPage() {
  const tasks = await getUserTasks(500);

  const serialized: CalendarTask[] = tasks
    .filter((t) => t.dueDate)
    .map((t) => ({
      id: t.id,
      title: t.title,
      courseId: t.courseId,
      courseName: t.courseName,
      taskType: t.taskType,
      isCompleted: t.isCompleted,
      dueDate: (t.dueDate as Date).toISOString(),
    }));

  return <CalendarView tasks={serialized} />;
}
