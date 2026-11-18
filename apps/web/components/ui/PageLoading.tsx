/** Instant feedback while the next App Router segment loads. */
export function PageLoading({ label = "Загрузка…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6">
      <div
        className="h-8 w-8 animate-pulse rounded-full border-2 border-brand-200 border-t-brand-700"
        aria-hidden
      />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}
