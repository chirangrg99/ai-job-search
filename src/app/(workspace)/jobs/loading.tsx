export default function JobsLoading() {
  return (
    <div role="status" className="space-y-6">
      <p>Loading jobs and sync history…</p>
      <div
        className="h-60 animate-pulse rounded-lg bg-surface-subtle"
        aria-hidden="true"
      />
    </div>
  );
}
