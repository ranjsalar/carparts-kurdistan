/*
  DESTRUCTIVE — wipes all operational data so the system can go live clean.

  Deletes: every customer account, part request, payment, notification, status
  log, OTP code, admin login log and admin activity log.
  Keeps:   admin accounts, and the entire vehicle/part taxonomy
           (brands, models, years, categories, sub-categories, parts) plus the
           payment receiving accounts.

  Safety, because this is irreversible:
    • never runs automatically — it is not wired into `db seed`, any npm
      script, or the build;
    • prints the exact database host/name it is about to modify and requires
      you to confirm that name back with --confirm-database=<name>;
    • refuses to run unless --yes-wipe-all-data is also passed;
    • refuses if no admin account would remain afterwards.

  Usage:
    npx tsx scripts/reset-production-data.ts            # dry run: shows counts
    npx tsx scripts/reset-production-data.ts --yes-wipe-all-data --confirm-database=carparts
*/
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — refusing to run.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

function describeTarget(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    return {
      host: `${parsed.hostname}:${parsed.port || "5432"}`,
      database: parsed.pathname.replace(/^\//, ""),
    };
  } catch {
    return { host: "unknown", database: "unknown" };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const armed = args.includes("--yes-wipe-all-data");
  const confirmArg = args.find((a) => a.startsWith("--confirm-database="));
  const confirmed = confirmArg?.split("=")[1];
  const target = describeTarget(url!);

  const counts = {
    customers: await prisma.user.count({ where: { role: "CUSTOMER" } }),
    admins: await prisma.user.count({ where: { role: "ADMIN" } }),
    requests: await prisma.partRequest.count(),
    payments: await prisma.payment.count(),
    notifications: await prisma.notification.count(),
    statusLogs: await prisma.statusLog.count(),
    loginLogs: await prisma.adminLoginLog.count(),
    activityLogs: await prisma.adminActivityLog.count(),
  };
  const taxonomy = {
    brands: await prisma.brand.count(),
    models: await prisma.carModel.count(),
    years: await prisma.yearRange.count(),
    parts: await prisma.part.count(),
  };

  console.log("\n  TARGET DATABASE");
  console.log(`    host:     ${target.host}`);
  console.log(`    database: ${target.database}`);
  console.log("\n  WILL DELETE");
  for (const [k, v] of Object.entries(counts)) {
    if (k !== "admins") console.log(`    ${k.padEnd(14)} ${v}`);
  }
  console.log("\n  WILL KEEP");
  console.log(`    admin accounts ${counts.admins}`);
  for (const [k, v] of Object.entries(taxonomy)) console.log(`    ${k.padEnd(14)} ${v}`);

  if (counts.admins === 0) {
    console.error("\n  ABORT: no admin account exists — you would be locked out.");
    process.exit(1);
  }

  if (!armed || confirmed !== target.database) {
    console.log("\n  DRY RUN — nothing was deleted.");
    console.log("  To actually wipe, re-run with BOTH flags:");
    console.log(
      `    npx tsx scripts/reset-production-data.ts --yes-wipe-all-data --confirm-database=${target.database}\n`,
    );
    if (armed && confirmed !== target.database) {
      console.error(`  (--confirm-database=${confirmed ?? ""} did not match "${target.database}")`);
    }
    return;
  }

  // Order matters: children before parents. Notifications null their request
  // reference on delete, so they are removed explicitly first.
  await prisma.notification.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.statusLog.deleteMany({});
  await prisma.partRequest.deleteMany({});
  await prisma.otpCode.deleteMany({});
  await prisma.adminLoginLog.deleteMany({});
  await prisma.adminActivityLog.deleteMany({});
  const removed = await prisma.user.deleteMany({ where: { role: "CUSTOMER" } });

  const after = {
    customers: await prisma.user.count({ where: { role: "CUSTOMER" } }),
    admins: await prisma.user.count({ where: { role: "ADMIN" } }),
    requests: await prisma.partRequest.count(),
    payments: await prisma.payment.count(),
    notifications: await prisma.notification.count(),
    statusLogs: await prisma.statusLog.count(),
    brands: await prisma.brand.count(),
    models: await prisma.carModel.count(),
    years: await prisma.yearRange.count(),
    parts: await prisma.part.count(),
  };
  console.log(`\n  WIPED. ${removed.count} customer accounts removed.`);
  console.log("  Post-wipe state:", JSON.stringify(after));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
