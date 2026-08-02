export function normalizeIdentityEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  const at = email.indexOf("@");
  if (!email || at <= 0 || at !== email.lastIndexOf("@") || at === email.length - 1) {
    throw new InvalidIdentityError("An authenticated email identity is required.");
  }
  return email;
}

export class InvalidIdentityError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidIdentityError";
  }
}

export class IdentityConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "IdentityConfigurationError";
  }
}

export async function userIdentityId(value, pepper) {
  const normalized = normalizeIdentityEmail(value);
  if (typeof pepper !== "string" || pepper.length < 32) {
    throw new IdentityConfigurationError("The identity secret is unavailable.");
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`rivaltrace-user-v2:${normalized}`),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
