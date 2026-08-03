import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL.");
}

export const sql = neon(connectionString);

export async function getDatabaseHealth() {
  const [row] = await sql`
    select
      now() as server_time,
      current_database() as database_name,
      current_user as db_user
  `;

  return row;
}

