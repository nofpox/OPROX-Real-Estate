/**
 * Database backup script — pg_dump to local file.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run backup
 *
 * To ship to S3 add these secrets in Replit:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BACKUP_S3_BUCKET
 *
 * Then uncomment the S3 upload block at the bottom.
 */
import { execSync } from "node:child_process";
import fs          from "node:fs";
import path        from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const BACKUP_DIR = path.join(process.cwd(), "backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const timestamp  = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const filename   = `grand-pms-${timestamp}.sql`;
const filepath   = path.join(BACKUP_DIR, filename);

console.log(`[backup] Dumping database → ${filepath}`);

try {
  execSync(`pg_dump "${DATABASE_URL}" -f "${filepath}" --no-password`, { stdio: "inherit" });
  const size = fs.statSync(filepath).size;
  console.log(`[backup] Done — ${(size / 1024).toFixed(1)} KB`);
} catch (err) {
  console.error("[backup] pg_dump failed:", err);
  process.exit(1);
}

// ── Optional S3 upload ────────────────────────────────────────────────────────
// To enable: add AWS_* secrets in Replit → Secrets panel, then uncomment below.
//
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
//
// const bucket = process.env.BACKUP_S3_BUCKET;
// const region = process.env.AWS_REGION ?? "us-east-1";
// if (bucket) {
//   const s3 = new S3Client({ region });
//   const body = fs.readFileSync(filepath);
//   await s3.send(new PutObjectCommand({
//     Bucket: bucket,
//     Key: `backups/${filename}`,
//     Body: body,
//     ServerSideEncryption: "AES256",
//   }));
//   console.log(`[backup] Uploaded to s3://${bucket}/backups/${filename}`);
// }

console.log(`[backup] Local backup complete: ${filepath}`);
console.log("[backup] To enable S3: add AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BACKUP_S3_BUCKET to Replit Secrets, then uncomment the S3 block in this file.");
