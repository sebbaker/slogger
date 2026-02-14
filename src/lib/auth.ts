import crypto from "node:crypto";
import { readConfig } from "@/lib/config";

export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function verifyApiKey(raw: string): boolean {
  const hash = hashKey(raw);
  const config = readConfig();
  return config.api_keys.some((item) => item.hash === hash);
}

export function getAuthKey(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim() || null;
}

export function verifyRequest(request: Request): boolean {
  const raw = getAuthKey(request);
  if (!raw) {
    return false;
  }

  return verifyApiKey(raw);
}
