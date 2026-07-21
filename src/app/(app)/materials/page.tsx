import { getUserCourses } from "@/actions/courses";
import { getUserMaterials } from "@/actions/materials";
import { MaterialsView, type MaterialRow } from "./materials-view";

export default async function MaterialsIndexPage() {
  const [materials, courses] = await Promise.all([
    getUserMaterials(500),
    getUserCourses(),
  ]);

  const rows: MaterialRow[] = materials.map((m) => ({
    id: m.id,
    name: m.name,
    url: m.url,
    fileType: m.fileType,
    fileCategory: m.fileCategory,
    fileSize: m.fileSize,
    courseId: m.courseId,
    courseName: m.courseName,
    uploadedAt: (m.uploadedAt as Date).toISOString(),
  }));

  return (
    <MaterialsView
      materials={rows}
      courses={courses.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
