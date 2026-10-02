import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export function createDatabase(url: string) {
  const client = postgres(url, { prepare: false, max: 1 });
  return drizzle({ client });
}

export type Database = ReturnType<typeof createDatabase>;
