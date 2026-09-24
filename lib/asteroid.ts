import "server-only";

// Server-side calls with your API key. Never import this file from a client
// component: the key would ship to the browser.

const API_URL = process.env.ASTEROID_API_URL ?? "https://odyssey.asteroid.ai";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`asteroid: ${name} is not set`);
  return value;
}

export type ShareLink = {
  id: string;
  status: "pending" | "completed" | "expired" | "revoked";
  expiresAt: string;
  resultItemId?: string;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/agents/v2${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      "X-Api-Key": env("ASTEROID_API_KEY"),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`asteroid: ${init?.method ?? "GET"} ${path} returned ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/**
 * Creates a credential request from your vault template. The token comes
 * back once. Store it server-side and hand it only to the user it is for.
 */
export async function createShareLink(input: {
  /** Item name. Must be unique in your organization, so include your user ID. */
  name: string;
  title: string;
  description?: string;
}): Promise<{ link: ShareLink; token: string }> {
  return call("/vault/share-links", {
    method: "POST",
    body: JSON.stringify({
      organizationId: env("ASTEROID_ORGANIZATION_ID"),
      templateId: env("ASTEROID_TEMPLATE_ID"),
      ...input,
    }),
  });
}

export async function getShareLinkStatus(linkId: string): Promise<ShareLink | undefined> {
  const orgId = encodeURIComponent(env("ASTEROID_ORGANIZATION_ID"));
  const links = await call<ShareLink[]>(`/vault/share-links?organizationId=${orgId}`);
  return links.find((l) => l.id === linkId);
}

export async function revokeShareLink(linkId: string): Promise<void> {
  await call(`/vault/share-links/${encodeURIComponent(linkId)}/revoke`, { method: "POST" });
}
