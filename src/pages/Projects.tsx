import { Hammer } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export function Projects() {
  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Steps, processes, and saved project lists."
      />
      <EmptyState
        icon={<Hammer size={28} />}
        title="Phase 8 will land projects"
        description="Steps + processes + lists, mirroring Chores. A list can mix free-floating steps with whole processes."
      />
    </div>
  );
}
