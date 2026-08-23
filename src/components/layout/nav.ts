import { CalendarDays, ListChecks, Sparkles, BookOpen, BarChart3 } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Aujourd'hui", icon: Sparkles },
  { href: "/echeances", label: "Échéances", icon: ListChecks },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/matieres", label: "Matières", icon: BookOpen },
  { href: "/progression", label: "Progression", icon: BarChart3 },
] as const;
