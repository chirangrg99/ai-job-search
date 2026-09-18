export default function PreferencesLoading() {
  return (
    <div role="status" className="space-y-6">
      <p>Loading saved searches…</p>
      <div aria-hidden="true" className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-lg bg-surface-subtle"
          />
        ))}
      </div>
    </div>
  );
}
