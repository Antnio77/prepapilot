import { CalendarDays, ListChecks, Sparkles, BookOpen, BarChart3, Layers } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Aujourd'hui", icon: Sparkles },
  { href: "/echeances", label: "Échéances", icon: ListChecks },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/exercices", label: "Exercices", icon: Layers },
  { href: "/matieres", label: "Matières", icon: BookOpen },
  { href: "/progression", label: "Progression", icon: BarChart3 },
] as const;
