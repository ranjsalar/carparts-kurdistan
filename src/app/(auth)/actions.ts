"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { issueOtp, normalizePhone, verifyOtpCode } from "@/lib/otp";
import { clientIp, rateLimit } from "@/lib/rate-limit";

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

/** Records a failed admin credential attempt; locks at the threshold. */
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

  // A suspended customer keeps their account and history but cannot sign in.
  if (user?.suspendedAt) redirect("/login?error=suspended");

  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    if (user?.role === "ADMIN") {
      await recordAdminFailure(user.id);
      await logAdminAttempt(email, user.id, false, "password_fail");
    }
    redirect("/login?error=credentials");
  }

  if (user.role === "ADMIN") {
    // Admin login is email + password. Rate limiting (above) and account
    // lockout still apply, and every attempt is audit-logged.
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null },
    });
    await logAdminAttempt(email, user.id, true, "password_ok");
    await createSession({ userId: user.id, role: user.role });
    redirect("/admin");
  }

  await createSession({ userId: user.id, role: user.role });
  redirect("/");
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

  // Same suspension gate as the email path.
  if (user?.suspendedAt) return { ok: false, error: "accountSuspended" };

  // Admin accounts must go through the email + password form, which is where
  // lockout and admin audit logging live — phone OTP would bypass both.
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
