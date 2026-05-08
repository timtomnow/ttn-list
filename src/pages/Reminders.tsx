import { Bell } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export function Reminders() {
  return (
    <div>
      <PageHeader
        title="Reminders"
        subtitle="Generate calendar files that deep-link to a specific list."
      />
      <EmptyState
        icon={<Bell size={28} />}
        title="Phase 9 will wire this up"
        description="The .ics generator (src/lib/ics.ts) is already ported. This phase builds the form: pick a list, pick a time/recurrence, download an .ics whose URL deep-links to /shopping/lists/:id (or chores/projects equivalents)."
      />
    </div>
  );
}
