// Local-only preferences that survive across pages/tabs.
const KEY_REDIRECT = "coursely:pref:redirect-after-syllabus";

export function getRedirectAfterSyllabus(): boolean {
  if (typeof localStorage === "undefined") return true; // default on
  try {
    const v = localStorage.getItem(KEY_REDIRECT);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

export function setRedirectAfterSyllabus(next: boolean) {
  try {
    localStorage.setItem(KEY_REDIRECT, next ? "1" : "0");
  } catch {
    /* silent */
  }
}
