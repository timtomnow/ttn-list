import { ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export function Shopping() {
  return (
    <div>
      <PageHeader
        title="Shopping"
        subtitle="Items, groups, and saved lists you can shop."
      />
      <EmptyState
        icon={<ShoppingCart size={28} />}
        title="Phase 3 will land items + groups here"
        description="The scaffold is in place. The next session implements item/group CRUD and the saved-list editor."
      />
    </div>
  );
}
