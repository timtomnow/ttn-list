export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-xl bg-ink-900 dark:bg-ink-50">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-50 dark:text-ink-900" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 7 L18 7" />
          <path d="M7 12 L18 12" />
          <path d="M7 17 L15 17" />
          <circle cx="5" cy="7" r="1.2" fill="currentColor" />
          <circle cx="5" cy="12" r="1.2" fill="currentColor" />
          <circle cx="5" cy="17" r="1.2" fill="currentColor" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold leading-tight">TTN List</div>
        <div className="text-xs text-ink-400 dark:text-ink-500">Shop. Chore. Build.</div>
      </div>
    </div>
  );
}
