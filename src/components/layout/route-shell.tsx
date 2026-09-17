import { PageHeader } from "./page-header";

export function RouteShell({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <section
        aria-label={`${title} availability`}
        className="rounded-lg border bg-surface p-6 shadow-sm"
      >
        <h2 className="text-base font-semibold">
          This workspace is taking shape
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-text-secondary">
          This section is not available yet. You can explore the workspace using
          the navigation.
        </p>
      </section>
    </>
  );
}
