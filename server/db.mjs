import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL. Add it to .env.local.");
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

export async function getBootstrapData() {
  const [activities, healthConditions] = await sql.transaction([
    sql`
      select id, slug, name, description
      from airpath.activities
      order by name asc
    `,
    sql`
      select id, slug, name, description
      from airpath.health_conditions
      order by name asc
    `,
  ]);

  return {
    activities,
    healthConditions,
  };
}

