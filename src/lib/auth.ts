import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "carparts_session";
const PENDING_2FA_COOKIE = "carparts_2fa";
const SESSION_DAYS = 30;
// Admin sessions are deliberately short-lived: a stolen admin cookie is far
// more damaging than a customer one, so it expires within a working day.
const ADMIN_SESSION_HOURS = 12;
const PENDING_2FA_MINUTES = 5;

export type SessionPayload = {
  userId: string;
  role: "CUSTOMER" | "ADMIN";
};

export async function createSession(payload: SessionPayload) {
  const maxAgeSeconds =
    payload.role === "ADMIN" ? 60 * 60 * ADMIN_SESSION_HOURS : 60 * 60 * 24 * SESSION_DAYS;
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(secret);

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

/*
  2FA-pending stage: after an admin's password checks out, we hand them a
  short-lived token that only unlocks the TOTP step — a full admin session
  is never issued until the code is verified.
*/
export async function createPending2fa(userId: string) {
  const token = await new SignJWT({ userId, stage: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_2FA_MINUTES}m`)
    .sign(secret);

  (await cookies()).set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * PENDING_2FA_MINUTES,
    path: "/",
  });
}

export async function readPending2fa(): Promise<string | null> {
  const token = (await cookies()).get(PENDING_2FA_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.stage !== "2fa") return null;
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function clearPending2fa() {
  (await cookies()).delete(PENDING_2FA_COOKIE);
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      role: payload.role as SessionPayload["role"],
    };
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

/** For server actions / route handlers that must only run as admin. */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized: admin access required");
  }
  return user;
}
