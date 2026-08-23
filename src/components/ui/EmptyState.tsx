import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-14 px-6", className)}>
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-surface-hover flex items-center justify-center mb-4">
          <Icon size={22} className="text-muted-foreground" />
        </div>
      )}
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
