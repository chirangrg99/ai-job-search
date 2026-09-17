import type { Metadata } from "next";
import { requireUser } from "@/server/auth/guard";
import { candidateRepository } from "@/server/candidate/repository";
import { ProfileWorkspace } from "@/features/profile/profile-workspace";
export const metadata: Metadata = { title: "Master Profile" };
export default async function ProfilePage() {
  const { client, user } = await requireUser();
  const profile = await candidateRepository(client, user.id).load();
  return <ProfileWorkspace profile={profile} />;
}
