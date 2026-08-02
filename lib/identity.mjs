export function normalizeIdentityEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("An authenticated email identity is required.");
  }
  return email;
}

export async function userIdentityId(value) {
  const normalized = normalizeIdentityEmail(value);
  const bytes = new TextEncoder().encode(`rivaltrace-user-v1:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
