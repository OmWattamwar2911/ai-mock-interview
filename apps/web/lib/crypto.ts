import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY env var is not set");
  // Expect a 32-byte hex string (64 hex chars) or base64-encoded 32-byte key
  const buf = Buffer.from(raw, raw.length === 64 ? "hex" : "base64");
  if (buf.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)");
  return buf;
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Output format: `<hex iv>:<hex tag>:<hex ciphertext>` (all colon-separated hex)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypts a string produced by `encrypt()`.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** Convenience: encrypt but return original if DATA_ENCRYPTION_KEY is a placeholder */
export function safeEncrypt(plaintext: string): string {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key || key.startsWith("replace-with")) return plaintext; // dev fallback
  return encrypt(plaintext);
}

export function safeDecrypt(ciphertext: string): string {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key || key.startsWith("replace-with")) return ciphertext;
  try {
    return decrypt(ciphertext);
  } catch {
    return ciphertext; // graceful fallback for plaintext stored in dev
  }
}
