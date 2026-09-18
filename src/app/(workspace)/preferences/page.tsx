import { requireUser } from "@/server/auth/guard";
import { preferencesRepository } from "@/server/preferences/repository";
import { PreferencesWorkspace } from "@/features/preferences/workspace";
export const metadata = { title: "Job Preferences" };
export default async function PreferencesPage() {
  const { client, user } = await requireUser();
  const searches = await preferencesRepository(client, user.id).list();
  return <PreferencesWorkspace searches={searches} />;
}
