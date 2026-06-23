export const COOKIE_NAME = "wc26_admin";

const PAYLOAD = "authenticated";

function toBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64Url(str: string): ArrayBuffer {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

async function getKey(): Promise<CryptoKey> {
  const secret =
    process.env.SESSION_SECRET ?? "dev-secret-change-in-production";
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(PAYLOAD),
  );
  return toBase64Url(sig);
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    const key = await getKey();
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(token),
      new TextEncoder().encode(PAYLOAD),
    );
  } catch {
    return false;
  }
}
