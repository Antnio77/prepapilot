"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store/useAppStore";
import { getUpcomingDeadlines, type DeadlineItem } from "@/lib/selectors";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DeadlineList } from "@/components/deadlines/DeadlineList";
import { MiniCalendar } from "@/components/deadlines/MiniCalendar";
import { DeadlineFormModal } from "@/components/deadlines/DeadlineFormModal";

export default function DeadlinesPage() {
  const state = useAppStore((s) => s);
  const items = getUpcomingDeadlines(state, 200, 365);
  const [editing, setEditing] = useState<DeadlineItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(item: DeadlineItem) {
    setEditing(item);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Échéances</h1>
          <p className="text-sm text-muted mt-1">DS, colles et devoirs à venir.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={15} /> Ajouter
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DeadlineList items={items} onSelect={openEdit} />
        </div>
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Calendrier</CardTitle>
            </CardHeader>
            <CardContent>
              <MiniCalendar items={items} />
            </CardContent>
          </Card>
        </div>
      </div>

      <DeadlineFormModal
        key={`${editing?.kind ?? "none"}-${editing?.id ?? "new"}`}
        open={showForm}
        onClose={() => setShowForm(false)}
        editing={editing}
      />
    </div>
  );
}
