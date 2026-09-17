import { WorkspaceBrand } from "./workspace-brand";
import { WorkspaceNavigation } from "./workspace-navigation";

export function AppSidebar() {
  return (
    <aside
      aria-label="Workspace sidebar"
      className="fixed inset-y-0 left-0 hidden w-sidebar flex-col gap-6 overflow-y-auto border-r bg-surface p-4 lg:flex"
    >
      <WorkspaceBrand />
      <WorkspaceNavigation />
      <p className="text-sm text-text-secondary">
        Verified facts.
        <br />
        Thoughtful applications.
      </p>
    </aside>
  );
}
