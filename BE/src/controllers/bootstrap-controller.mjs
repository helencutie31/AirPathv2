import { sql, getDatabaseHealth } from "../db.mjs";
import { getBootstrapAqiSnapshot } from "../services/bootstrap-aqi-cache.mjs";

export async function getHealthController() {
  return {
    health: await getDatabaseHealth(),
  };
}

export async function getBootstrapController() {
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
  const aqiSnapshot = await getBootstrapAqiSnapshot();

  return { activities, healthConditions, aqiSnapshot };
}
