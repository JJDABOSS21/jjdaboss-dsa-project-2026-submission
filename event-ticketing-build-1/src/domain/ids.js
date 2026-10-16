import { randomUUID, randomBytes } from "node:crypto";

export function newId() {
  return randomUUID();
}

// Excludes easily confused characters (I, O, 0, 1) so codes are easier to read aloud.
export function newReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let body = "";
  for (const byte of bytes) body += alphabet[byte % alphabet.length];
  return `BK-${body.slice(0, 4)}-${body.slice(4)}`;
}
