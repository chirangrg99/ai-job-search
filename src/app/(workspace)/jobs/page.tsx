import { requireUser } from "@/server/auth/guard";
import { discoveryRepository } from "@/server/discovery/repository";
import { createAdzunaProvider } from "@/server/discovery/factory";
import { DiscoveryWorkspace } from "@/features/discovery/workspace";
export const metadata = { title: "Jobs" };
export const maxDuration = 300;
export default async function JobsPage() {
  const { client, user } = await requireUser();
  return (
    <DiscoveryWorkspace
      data={await discoveryRepository(client, user.id).overview()}
      configured={createAdzunaProvider(client).validateConfiguration().valid}
    />
  );
}
