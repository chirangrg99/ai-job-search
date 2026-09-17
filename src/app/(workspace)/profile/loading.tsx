export default function ProfileLoading() {
  return (
    <div role="status" className="space-y-4">
      <p>Loading your master profile…</p>
      <div aria-hidden="true" className="h-48 rounded-lg bg-surface-subtle" />
      <div aria-hidden="true" className="h-72 rounded-lg bg-surface-subtle" />
    </div>
  );
}
