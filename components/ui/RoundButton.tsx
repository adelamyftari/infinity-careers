/** The square icon button: carousel and property arrows. */
export function RoundButton({ label, path, onClick, disabled }: { label: string; path: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 cursor-pointer items-center justify-center rounded-button border border-primary/55 bg-transparent text-primary transition-colors duration-[220ms] ease-out hover:border-primary hover:bg-primary hover:text-neutral active:border-primary active:bg-primary-soft active:text-neutral disabled:pointer-events-none disabled:opacity-40"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
