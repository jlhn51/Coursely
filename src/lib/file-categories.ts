export const FILE_CATEGORIES = [
  "syllabus",
  "slides",
  "notes",
  "other",
] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number];
