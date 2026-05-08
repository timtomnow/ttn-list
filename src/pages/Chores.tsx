import { ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export function Chores() {
  return (
    <div>
      <PageHeader
        title="Chores"
        subtitle="Items, routines, and saved chore lists."
      />
      <EmptyState
        icon={<ListChecks size={28} />}
        title="Phase 7 will land chores"
        description="Chores mirror Shopping minus quantity. Components are shared where the data model allows."
      />
    </div>
  );
}
