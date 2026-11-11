import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env";

/**
 * Symmetric encryption for stored secrets (organization LLM API keys).
 *
 * AES-256-GCM with a key derived from the validated JWT_SECRET - no extra
 * env var to manage, and the ciphertext is authenticated (GCM tag). Format:
 *
 *   enc:v1:<iv b64>:<tag b64>:<ciphertext b64>
 *
 * Only ciphertext is ever persisted (`api_key_encrypted`); the plaintext
 * never leaves this module and the API never serialises it back out.
 * `decryptSecret` is its counterpart, called by the AI layer at request
 * time (the plaintext then lives only inside `ai/client.ts` request headers).
 */
const KEY = createHash("sha256").update(env.jwtSecret).digest();
const PREFIX = "enc:v1:";

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  // PREFIX already ends in ":" - concatenating (not joining) keeps the stored
  // value at exactly `enc:v1:<iv>:<tag>:<ct>` as documented.
  return (
    PREFIX +
    [
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      encrypted.toString("base64"),
    ].join(":")
  );
}

/** Reverse `encryptSecret`. Rows written before encryption pass through. */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const segments = stored.slice(PREFIX.length).split(":");
  // Rows written before the format fix joined the colon-terminated PREFIX
  // with ":" and produced an empty first segment (`enc:v1::iv:tag:ct`) -
  // skip it so both formats decrypt.
  const [ivB64, tagB64, dataB64] = segments[0] === "" ? segments.slice(1) : segments;
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
