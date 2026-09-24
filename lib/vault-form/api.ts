import type { FieldValue, PublicShareLink, ShareLinkStatus } from "./types.ts";

// These calls run in the browser. The share token is their only credential,
// so the values go straight to Asteroid and never touch your servers.

export class ShareLinkError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Seconds to wait, set on a 429. */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ShareLinkError";
  }

  /** The link is completed, expired or revoked. Stop showing the form. */
  get gone(): boolean {
    return this.status === 410;
  }

  /** The link can never succeed. Ask your backend for a new one. */
  get needsNewLink(): boolean {
    return this.status === 404 || this.status === 409 || this.status === 410;
  }
}

async function call<T>(baseUrl: string, path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}/agents/public_v2${path}`, {
    ...init,
    headers: { ...init?.headers, "X-Share-Token": token },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
    throw new ShareLinkError(res.status, body?.message ?? res.statusText, retryAfter);
  }
  return (await res.json()) as T;
}

export function getShareLink(baseUrl: string, token: string): Promise<PublicShareLink> {
  return call(baseUrl, "/vault/share-link", token);
}

export function submitShareLink(
  baseUrl: string,
  token: string,
  values: FieldValue[],
): Promise<{ status: ShareLinkStatus }> {
  return call(baseUrl, "/vault/share-link/submit", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}
