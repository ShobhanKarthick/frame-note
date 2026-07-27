import 'dotenv/config';
import pool from '../db/connection.js';
import { directusConfigured, uploadToDirectus } from '../services/directus.js';
import type { Attachment } from '../types.js';

/**
 * One-off backfill: move legacy inline base64 attachments into Directus.
 *
 * Before 2026-07-10 the app stored pasted screenshots as raw base64 data URLs
 * inside annotations.attachments. Those rows make GET /api/annotations/video/:id
 * return megabytes of image data, which is slow to ship over the wire. This
 * uploads each one to Directus and rewrites the row to hold a hosted URL.
 *
 *   npm run backfill:attachments                  # dry run (default)
 *   npm run backfill:attachments -- --apply       # actually write
 *   npm run backfill:attachments -- --apply --limit 1
 *   npm run backfill:attachments -- --video-id <id>
 *
 * Safety:
 *  - Dry run is the default; --apply is required to write.
 *  - --apply refuses to run unless a backup table exists (see BACKUP_HINT).
 *  - The row predicate is self-clearing (a migrated row stops matching), so the
 *    script is idempotent and resumable, and per-attachment failures simply get
 *    retried on the next run.
 */

// Matches rows whose attachments JSON still contains a base64 data URL.
const LEGACY_PREDICATE = `attachments::text LIKE '%"data:%'`;

const BACKUP_TABLE = 'annotations_backup_base64';
const BACKUP_HINT = `
Create the backup first (it only copies the rows this script would touch):

  psql "$DATABASE" -c "CREATE TABLE ${BACKUP_TABLE} AS
    SELECT id, attachments FROM annotations WHERE ${LEGACY_PREDICATE};"

To roll back afterwards:

  psql "$DATABASE" -c "UPDATE annotations a SET attachments = b.attachments
    FROM ${BACKUP_TABLE} b WHERE a.id = b.id;"
`;

interface Row {
  id: string;
  video_id: string;
  created_at: string;
  attachments: Attachment[] | null;
}

const args = process.argv.slice(2);
const hasFlag = (name: string) => args.includes(name);
function flagValue(name: string): string | undefined {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
}

const apply = hasFlag('--apply');
const limit = Number(flagValue('--limit') ?? 0) || null;
const videoId = flagValue('--video-id') ?? null;

const MB = (n: number) => (n / 1048576).toFixed(2) + ' MB';

async function backupTableExists(): Promise<boolean> {
  const { rows } = await pool.query(`SELECT to_regclass($1) AS t`, [`public.${BACKUP_TABLE}`]);
  return rows[0]?.t !== null;
}

async function main() {
  if (apply && !directusConfigured()) {
    console.error('❌ DIRECTUS_URL / DIRECTUS_TOKEN / DIRECTUS_UPLOAD_FOLDER are not set.');
    console.error('   Refusing to run so the migration cannot partially complete.');
    process.exit(1);
  }

  if (apply && !(await backupTableExists())) {
    console.error(`❌ --apply requires a backup table "${BACKUP_TABLE}", which does not exist.`);
    console.error(BACKUP_HINT);
    process.exit(1);
  }

  const where = [LEGACY_PREDICATE, videoId ? 'video_id = $1' : null].filter(Boolean).join(' AND ');
  const params = videoId ? [videoId] : [];
  const { rows } = await pool.query<Row>(
    `SELECT id, video_id, created_at, attachments
       FROM annotations
      WHERE ${where}
      ORDER BY created_at
      ${limit ? `LIMIT ${limit}` : ''}`,
    params
  );

  if (rows.length === 0) {
    console.log('✅ No rows contain inline base64 attachments. Nothing to do.');
    return;
  }

  // ---- Survey (always printed, and the whole output of a dry run) ----
  const byVideo = new Map<string, { rows: number; bytes: number }>();
  let inlineCount = 0;
  let inlineBytes = 0;
  let largest = { bytes: 0, name: '', id: '' };

  for (const row of rows) {
    let rowBytes = 0;
    for (const att of row.attachments ?? []) {
      if (!att?.url?.startsWith('data:')) continue;
      inlineCount++;
      inlineBytes += att.url.length;
      rowBytes += att.url.length;
      if (att.url.length > largest.bytes) {
        largest = { bytes: att.url.length, name: att.name, id: row.id };
      }
    }
    const acc = byVideo.get(row.video_id) ?? { rows: 0, bytes: 0 };
    byVideo.set(row.video_id, { rows: acc.rows + 1, bytes: acc.bytes + rowBytes });
  }

  console.log(apply ? '⚙️  APPLYING — this writes to the database' : '🔍 DRY RUN — no writes (pass --apply to migrate)');
  console.log(`  rows matched:        ${rows.length}`);
  console.log(`  inline attachments:  ${inlineCount}`);
  console.log(`  inline bytes:        ${MB(inlineBytes)}`);
  if (largest.bytes) {
    console.log(`  largest single:      ${MB(largest.bytes)}  ("${largest.name}", annotation ${largest.id.slice(0, 8)}…)`);
  }
  console.log('  by video:');
  for (const [vid, s] of [...byVideo].sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`    ${vid.slice(0, 24).padEnd(24)}  ${String(s.rows).padStart(3)} rows  ${MB(s.bytes).padStart(9)}`);
  }

  if (!apply) {
    console.log('\nNothing was changed. Re-run with --apply (and a backup table) to migrate.');
    return;
  }

  // ---- Apply ----
  const failures: Array<{ rowId: string; name: string; error: string }> = [];
  let migratedAtts = 0;
  let updatedRows = 0;

  for (const [i, row] of rows.entries()) {
    const migrated: Attachment[] = [];
    let changed = false;

    for (const att of row.attachments ?? []) {
      if (!att?.url?.startsWith('data:')) {
        migrated.push(att);
        continue;
      }
      try {
        const uploaded = await uploadToDirectus(att.url, att.name);
        // Keep the original attachment id: the Directus file id is already
        // embedded in the asset URL, and preserving it keeps any previously
        // exported JSON consistent with what's in the database.
        migrated.push({ ...att, url: uploaded.url });
        migratedAtts++;
        changed = true;
      } catch (error: any) {
        // Leave this attachment as base64. The row keeps matching the predicate,
        // so the next run retries just the stragglers.
        failures.push({ rowId: row.id, name: att?.name ?? '(unnamed)', error: error?.message || String(error) });
        migrated.push(att);
      }
    }

    if (changed) {
      // Single-statement update is atomic on its own; nothing else in the app
      // ever rewrites `attachments` after insert (PATCH only touches
      // start_time/end_time/text/status), so no locking is needed.
      await pool.query('UPDATE annotations SET attachments = $1 WHERE id = $2', [
        JSON.stringify(migrated),
        row.id,
      ]);
      updatedRows++;
    }
    process.stdout.write(`\r  migrating… ${i + 1}/${rows.length} rows, ${migratedAtts} files uploaded`);
  }

  console.log(`\n\n✅ Done. ${updatedRows} rows updated, ${migratedAtts} attachments moved to Directus.`);

  if (failures.length) {
    console.log(`\n⚠️  ${failures.length} attachment(s) failed and were left as base64 (re-run to retry):`);
    for (const f of failures.slice(0, 10)) {
      console.log(`    ${f.rowId.slice(0, 8)}…  "${f.name}"  — ${f.error}`);
    }
    if (failures.length > 10) console.log(`    …and ${failures.length - 10} more`);
  }

  const { rows: [remaining] } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM annotations WHERE ${LEGACY_PREDICATE}`
  );
  console.log(`\nRows still holding inline base64: ${remaining.count}`);
}

main()
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
