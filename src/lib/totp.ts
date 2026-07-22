import { createHmac, randomBytes } from "crypto";

/*
  Minimal TOTP (RFC 6238) over HOTP (RFC 4226), SHA-1, 6 digits, 30s steps —
  the profile every authenticator app (Google Authenticator, Authy, 1Password,
  Microsoft Authenticator) uses by default. Implemented directly on node
  crypto to avoid a dependency; correctness is checked against the RFC 4226
  appendix D test vectors in the verification suite.
*/

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** New 160-bit secret, base32-encoded for authenticator apps. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** RFC 4226 HOTP: 6-digit code for a given counter. Exported for the test vectors. */
export function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(msg).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    (((digest[offset] & 0x7f) << 24) |
      (digest[offset + 1] << 16) |
      (digest[offset + 2] << 8) |
      digest[offset + 3]) %
    10 ** DIGITS;
  return code.toString().padStart(DIGITS, "0");
}

/** Current TOTP code for a base32 secret (for tests/tooling, not UI). */
export function totpCode(secretBase32: string, at: number = Date.now()): string {
  return hotp(base32Decode(secretBase32), Math.floor(at / 1000 / STEP_SECONDS));
}

/**
 * Verifies a 6-digit code with a ±1 step window (90 seconds total), which
 * tolerates clock drift between the server and the phone.
 */
export function verifyTotp(secretBase32: string, token: string, at: number = Date.now()): boolean {
  const clean = token.trim();
  if (!/^[0-9]{6}$/.test(clean)) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(at / 1000 / STEP_SECONDS);
  for (const drift of [-1, 0, 1]) {
    if (hotp(secret, counter + drift) === clean) return true;
  }
  return false;
}

/** otpauth:// URI for adding the account to an authenticator app. */
export function totpUri(secretBase32: string, accountName: string): string {
  const issuer = encodeURIComponent("CarParts Kurdistan");
  const account = encodeURIComponent(accountName);
  return `otpauth://totp/${issuer}:${account}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
