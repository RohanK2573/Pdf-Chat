import { db } from "./index.js";
import { appUser } from "./schema.js";
import { sql } from "drizzle-orm";

export async function upsertUser({ externalId, email, name }) {
  const [user] = await db
    .insert(appUser)
    .values({ externalId, email, name })
    .onConflictDoUpdate({
      target: appUser.externalId,
      set: {
        email: sql`excluded.email`,
        name: sql`excluded.name`,
      },
    })
    .returning({ id: appUser.id });
  return user;
}
