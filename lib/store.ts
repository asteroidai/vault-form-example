import "server-only";

// Demo storage. Replace it with a table in your own database, keyed by your
// user ID. Treat the token as a secret: it lets anyone who holds it fill in
// the request until it completes or expires.

export type StoredRequest = { linkId: string; token: string };

const requests = new Map<string, StoredRequest>();

export function getRequest(userId: string): StoredRequest | undefined {
  return requests.get(userId);
}

export function saveRequest(userId: string, request: StoredRequest): void {
  requests.set(userId, request);
}
