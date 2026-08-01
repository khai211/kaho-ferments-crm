export const ADMIN_COOKIE_NAME = "kaho_admin_session";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Cookie value on a successful login — a hash of ADMIN_PASSWORD, never the password itself. */
export async function adminSessionToken(): Promise<string> {
  return sha256Hex(process.env.ADMIN_PASSWORD ?? "");
}

export async function isValidAdminSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue || !process.env.ADMIN_PASSWORD) return false;
  return cookieValue === (await adminSessionToken());
}
