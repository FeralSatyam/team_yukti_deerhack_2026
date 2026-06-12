export function Chip({
  label,
  onRemove,
  variant = "default",
  selected = false,
  onClick,
}) {
  const isSuggestion = variant === "suggestion";

  if (isSuggestion) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex min-h-11 items-center rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 ${
          selected
            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
            : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--primary)]/40 hover:bg-gray-50"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-gray-50 px-3.5 py-2 text-sm font-medium text-[var(--foreground)]">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-gray-200 hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
