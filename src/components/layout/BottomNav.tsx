import { NavLink } from 'react-router-dom';
import { ShoppingCart, ListChecks, Hammer, Bell, Settings as SettingsIcon, type LucideIcon } from 'lucide-react';

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-ink-900/90 md:hidden"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 pb-2 pt-1">
        <NavItem to="/shopping" label="Shopping" Icon={ShoppingCart} />
        <NavItem to="/chores" label="Chores" Icon={ListChecks} />
        <NavItem to="/projects" label="Projects" Icon={Hammer} />
        <NavItem to="/reminders" label="Reminders" Icon={Bell} />
        <NavItem to="/settings" label="Settings" Icon={SettingsIcon} />
      </div>
    </nav>
  );
}

type NavItemProps = {
  to: string;
  label: string;
  Icon: LucideIcon;
};

function NavItem({ to, label, Icon }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition',
          isActive
            ? 'text-ink-900 dark:text-ink-50'
            : 'text-ink-400 dark:text-ink-500',
        ].join(' ')
      }
    >
      <Icon size={20} />
      {label}
    </NavLink>
  );
}
