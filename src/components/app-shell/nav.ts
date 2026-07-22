import {
  BookOpen,
  Calendar,
  CheckSquare,
  FileText,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Mic,
  Settings,
  Timer,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Pinned",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Courses", href: "/courses", icon: BookOpen },
      { label: "Calendar", href: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "Study",
    items: [
      { label: "Tasks", href: "/tasks", icon: CheckSquare },
      { label: "Materials", href: "/materials", icon: FileText },
      { label: "Focus mode", href: "/focus", icon: Timer },
    ],
  },
  {
    label: "AI",
    items: [
      { label: "AI Tutor", href: "/tutor", icon: MessageSquare },
      { label: "Flashcards", href: "/flashcards", icon: Layers, soon: true },
      { label: "Notes", href: "/notes", icon: Mic, soon: true },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];
