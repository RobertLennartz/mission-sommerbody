// Full logical backup of every table as JSON, read with the secret key.
// Usage: npm run backup   (reads .env.local; writes backups/<timestamp>/)
// The backups folder is gitignored: it holds personal health data.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TABLES = [
  "athletes",
  "exercises",
  "plan_templates",
  "plan_template_exercises",
  "week_templates",
  "week_template_items",
  "sessions",
  "session_exercises",
  "session_sets",
  "daily_logs",
  "meals",
  "checkups",
  "checkup_skinfolds",
];
const PAGE = 1000;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL oder SUPABASE_SECRET_KEY fehlt (.env.local).");
  process.exit(1);
}

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { apikey: key, Range: `${from}-${from + PAGE - 1}`, "Range-Unit": "items", Prefer: "count=exact" },
    });
    if (!res.ok && res.status !== 206) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = join("backups", stamp);
mkdirSync(dir, { recursive: true });

const manifest = { created_at: new Date().toISOString(), source: url, tables: {} };
for (const table of TABLES) {
  const rows = await fetchAll(table);
  writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 2));
  manifest.tables[table] = rows.length;
}
writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Backup in ${dir}`);
console.table(manifest.tables);
