import { NextResponse } from "next/server";

import { createShareLink, getShareLinkStatus, revokeShareLink } from "@/lib/asteroid.ts";
import { getRequest, saveRequest } from "@/lib/store.ts";

// Replace with your own session lookup. The user ID keeps one request per
// user and makes the vault item name unique.
async function currentUser(): Promise<{ id: string; name: string }> {
  return { id: "demo-user-1", name: "Demo Clinician" };
}

/**
 * Returns the share token for the signed-in user. It reuses a pending
 * request and creates a new one only when there is none, so page loads do
 * not use up the creation rate limit. Send { "renew": true } after the form
 * reports that the link can no longer succeed.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  const { renew = false } = (await request.json().catch(() => ({}))) as { renew?: boolean };

  const existing = getRequest(user.id);
  if (existing) {
    const link = await getShareLinkStatus(existing.linkId);
    if (link?.status === "completed" && !renew) {
      return NextResponse.json({ status: "completed" });
    }
    if (link?.status === "pending" && !renew) {
      return NextResponse.json({ status: "pending", token: existing.token });
    }
    // A renewed pending link would still hold the item name, so free it.
    if (link?.status === "pending") await revokeShareLink(existing.linkId);
  }

  const { link, token } = await createShareLink({
    // Your user ID keeps the name unique. A clash returns 409.
    name: `EHR login ${user.id}${existing ? ` ${Date.now()}` : ""}`,
    title: "Connect your EHR",
    description: `So we can sync your notes, ${user.name}.`,
  });
  saveRequest(user.id, { linkId: link.id, token });
  return NextResponse.json({ status: "pending", token });
}
