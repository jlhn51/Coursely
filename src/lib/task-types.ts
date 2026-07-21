// Union of the LLM's taxonomy and the legacy in-app tags (pset/paper) so
// existing rows keep rendering as they always did.
export const TASK_TYPES = [
  "pset",
  "assignment",
  "exam",
  "quiz",
  "paper",
  "project",
  "presentation",
  "reading",
  "other",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

// The subset the syllabus LLM is allowed to return. Keeping this tighter than
// TASK_TYPES lets us evolve the LLM taxonomy without loosening what the app
// knows how to render.
export const LLM_TASK_TYPES = [
  "reading",
  "assignment",
  "exam",
  "quiz",
  "project",
  "presentation",
  "other",
] as const;

export type LlmTaskType = (typeof LLM_TASK_TYPES)[number];
