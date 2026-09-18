import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getServerEnv } from "@/server/env";
import { AdzunaJobProvider } from "./providers/adzuna";
export function createAdzunaProvider(client: SupabaseClient<Database>) {
  const env = getServerEnv();
  return new AdzunaJobProvider(
    { appId: env.ADZUNA_APP_ID, appKey: env.ADZUNA_APP_KEY },
    {
      fetch: globalThis.fetch,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: Date.now,
      reserveRequest: async () => {
        const { data, error } = await client.rpc("reserve_adzuna_request", {
          delay_seconds: 0,
        });
        if (error) throw new Error("Could not reserve API budget.");
        return data === true;
      },
      cooldown: async (seconds) => {
        const { error } = await client.rpc("reserve_adzuna_request", {
          delay_seconds: seconds,
        });
        if (error) throw new Error("Could not record provider cooldown.");
      },
    },
  );
}
