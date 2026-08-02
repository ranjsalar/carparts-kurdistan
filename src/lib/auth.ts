import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "carparts_session";
const SESSION_DAYS = 30;
// Admin sessions are deliberately short-lived: a stolen admin cookie is far
// more damaging than a customer one, so it expires within a working day.
const ADMIN_SESSION_HOURS = 12;

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
