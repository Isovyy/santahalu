// Prisma ORM 8 returns DateTime columns as Temporal.Instant. Node < 26 has no
// built-in Temporal, so load the polyfill before anything touches the client.
import "temporal-polyfill/full/global";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "@/app/generated/prisma8/contract";
import contractJson from "@/app/generated/prisma8/contract.json";

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined;
};

function createDb() {
  return postgres<Contract>({
    contractJson,
    url: process.env.DATABASE_URL!,
  });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
