"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  clearPending2fa,
  createPending2fa,
  createSession,
  destroySession,
  readPending2fa,
} from "@/lib/auth";
import { issueOtp, normalizePhone, verifyOtpCode } from "@/lib/otp";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/totp";

// ── Admin lockout + audit ────────────────────────────────────────────────────

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

async function logAdminAttempt(
  email: string,
  userId: string | null,
  success: boolean,
  note: string,
) {
  await prisma.adminLoginLog.create({
    data: { email, userId, ip: await clientIp(), success, note },
  });
}

/** Records a failed admin credential/TOTP attempt; locks at the threshold. */
async function recordAdminFailure(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLogins: { increment: 1 } },
  });
  if (user.failedLogins >= LOCKOUT_THRESHOLD) {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000), failedLogins: 0 },
    });
    return true;
  }
  return false;
}

function isLocked(user: { lockedUntil: Date | null }) {
  return user.lockedUntil !== null && user.lockedUntil > new Date();
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=invalid");

  const ip = await clientIp();
  const email = parsed.data.email.toLowerCase();
  if (
    !rateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000).ok ||
    !rateLimit(`login:email:${email}`, 5, 15 * 60 * 1000).ok
  ) {
    redirect("/login?error=rate");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Admin accounts: lockout check runs before the password so a locked
  // account can't keep burning attempts, and every outcome is audit-logged.
  if (user?.role === "ADMIN" && isLocked(user)) {
    await logAdminAttempt(email, user.id, false, "locked");
    redirect("/login?error=locked");
  }

  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    if (user?.role === "ADMIN") {
      await recordAdminFailure(user.id);
      await logAdminAttempt(email, user.id, false, "password_fail");
    }
    redirect("/login?error=credentials");
  }

  if (user.role === "ADMIN") {
    // Never issue an admin session on password alone — stage the TOTP step.
    // totpEnabled=false routes to mandatory first-time setup instead.
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null },
    });
    await logAdminAttempt(email, user.id, false, "password_ok_awaiting_totp");
    await createPending2fa(user.id);
    redirect(user.totpEnabled ? "/login/2fa" : "/login/2fa/setup");
  }

  await createSession({ userId: user.id, role: user.role });
  redirect("/");
}

// ── Admin 2FA (TOTP) ─────────────────────────────────────────────────────────

/** Verifies the 6-digit code during login (secret already enrolled). */
export async function verifyAdminTotp(code: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await readPending2fa();
  if (!userId) return { ok: false, error: "totpExpiredSession" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN" || !user.totpSecret || !user.totpEnabled) {
    return { ok: false, error: "totpExpiredSession" };
  }
  if (isLocked(user)) {
    await logAdminAttempt(user.email ?? "", user.id, false, "locked");
    return { ok: false, error: "accountLocked" };
  }

  if (!verifyTotp(user.totpSecret, code)) {
    const nowLocked = await recordAdminFailure(user.id);
    await logAdminAttempt(user.email ?? "", user.id, false, "totp_fail");
    return { ok: false, error: nowLocked ? "accountLocked" : "totpWrong" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null },
  });
  await logAdminAttempt(user.email ?? "", user.id, true, "totp_ok");
  await clearPending2fa();
  await createSession({ userId: user.id, role: user.role });
  redirect("/admin");
}

/** First-time enrollment: verifies a code against the freshly issued secret, then activates 2FA. */
export async function enableAdminTotp(code: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await readPending2fa();
  if (!userId) return { ok: false, error: "totpExpiredSession" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN" || !user.totpSecret) {
    return { ok: false, error: "totpExpiredSession" };
  }

  if (!verifyTotp(user.totpSecret, code)) {
    await logAdminAttempt(user.email ?? "", user.id, false, "totp_setup_fail");
    return { ok: false, error: "totpWrong" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, failedLogins: 0, lockedUntil: null },
  });
  await logAdminAttempt(user.email ?? "", user.id, true, "totp_setup_ok");
  await clearPending2fa();
  await createSession({ userId: user.id, role: user.role });
  redirect("/admin");
}

// Phone format is validated by normalizePhone() below (shared with the OTP
// flow) rather than a second regex here, so "+964 750 123 4567" and
// "+9647501234567" are treated identically no matter which signup path is used.
const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) redirect("/signup?error=invalid");

  // Blank/whitespace-only input always becomes null — never an empty string
  // — so it can never collide with another blank signup under the phone
  // column's unique constraint (Postgres allows multiple NULLs, not multiple "").
  const phoneInput = parsed.data.phone?.trim();
  let phone: string | null = null;
  if (phoneInput) {
    phone = normalizePhone(phoneInput);
    if (!phone) redirect("/signup?error=invalid");
  }

  const email = parsed.data.email.toLowerCase();
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) redirect("/signup?error=exists");

  if (phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) redirect("/signup?error=phoneExists");
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        phone,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        role: "CUSTOMER",
      },
    });
  } catch (e) {
    // Defense in depth against a race between the checks above and this
    // insert (e.g. two concurrent signups for the same email/phone) — turn
    // the raw constraint violation into the same friendly redirect instead
    // of an unhandled 500.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined)?.join(",") ?? "";
      redirect(`/signup?error=${target.includes("phone") ? "phoneExists" : "exists"}`);
    }
    throw e;
  }

  await createSession({ userId: user.id, role: user.role });
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ── Phone OTP login ──────────────────────────────────────────────────────────

// Errors returned to the client are `errors.*` translation keys.
export async function requestPhoneOtp(rawPhone: string): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: "phoneInvalid" };

  const ip = await clientIp();
  if (
    !rateLimit(`otp-req:ip:${ip}`, 10, 60 * 60 * 1000).ok ||
    !rateLimit(`otp-req:phone:${phone}`, 5, 60 * 60 * 1000).ok
  ) {
    return { ok: false, error: "otpRateLimited" };
  }

  const result = await issueOtp(phone);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function verifyPhoneOtp(
  rawPhone: string,
  code: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: "phoneInvalid" };
  if (!/^[0-9]{6}$/.test(code.trim())) {
    return { ok: false, error: "codeSixDigits" };
  }

  const ip = await clientIp();
  if (
    !rateLimit(`otp-ver:ip:${ip}`, 20, 15 * 60 * 1000).ok ||
    !rateLimit(`otp-ver:phone:${phone}`, 10, 15 * 60 * 1000).ok
  ) {
    return { ok: false, error: "otpRateLimited" };
  }

  const result = await verifyOtpCode(phone, code);
  if (!result.ok) return { ok: false, error: result.error };

  let user = await prisma.user.findUnique({ where: { phone } });

  // Admin accounts must go through email + TOTP — phone OTP would otherwise
  // be a 2FA bypass.
  if (user?.role === "ADMIN") {
    await logAdminAttempt(user.email ?? phone, user.id, false, "phone_otp_blocked");
    return { ok: false, error: "adminPhoneLogin" };
  }

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          phone,
          name: name.trim() || "Customer",
          role: "CUSTOMER",
        },
      });
    } catch (e) {
      // Same defense-in-depth as signup(): a double-submit racing the
      // findUnique above could hit a P2002 on phone instead of crashing.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        user = await prisma.user.findUniqueOrThrow({ where: { phone } });
      } else {
        throw e;
      }
    }
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(user.role === "ADMIN" ? "/admin" : "/");
}
