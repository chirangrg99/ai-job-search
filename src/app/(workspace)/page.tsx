import type { Metadata } from "next";
import { requireUser } from "@/server/auth/guard";
import { jobReviewRepository } from "@/server/job-review/repository";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";
import { getServerEnv } from "@/server/env";
import { Dashboard } from "@/features/job-review/dashboard";
export const metadata: Metadata = { title: "Overview" };
export default async function Page() {
  const { client, user } = await requireUser();
  const data = await jobReviewRepository(
    client,
    user.id,
    getServerEnv().OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL,
  ).load();
  return <Dashboard {...data} now={new Date()} />;
}
