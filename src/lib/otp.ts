import { randomInt } from "crypto";
import { prisma } from "./db";

const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

// Errors are stable keys, translated at render time via the `errors.*`
// message namespace (same pattern across all lib modules).
export type OtpResult = { ok: true } | { ok: false; error: string };

/** Strip formatting and validate. Returns normalized phone or null. */
export function normalizePhone(raw: string): string | null {
  const phone = raw.replace(/[\s\-().]/g, "");
  return /^\+?[0-9]{10,15}$/.test(phone) ? phone : null;
}

export async function issueOtp(phone: string): Promise<OtpResult> {
  const recent = await prisma.otpCode.findFirst({
    where: {
      phone,
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) },
    },
  });
  if (recent) {
    return { ok: false, error: "otpCooldown" };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.otpCode.create({
    data: {
      phone,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  // TODO: send `code` to `phone` via a real SMS/WhatsApp provider (e.g. Twilio
  // Verify or a local Iraqi aggregator). For local dev the code is only logged
  // to the server console below.
  console.log(`[OTP] Login code for ${phone}: ${code} (valid ${OTP_TTL_MINUTES} min)`);

  return { ok: true };
}

export async function verifyOtpCode(phone: string, code: string): Promise<OtpResult> {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) {
    return { ok: false, error: "otpExpired" };
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "otpTooMany" };
  }
  if (otp.code !== code.trim()) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "otpWrong" };
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
