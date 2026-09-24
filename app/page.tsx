"use client";

import { useCallback, useEffect, useState } from "react";

import { CredentialForm } from "@/lib/vault-form/CredentialForm.tsx";

const API_URL = process.env.NEXT_PUBLIC_ASTEROID_API_URL ?? "https://odyssey.asteroid.ai";

type Request = { status: "pending"; token: string } | { status: "completed" };

export default function Page() {
  const [request, setRequest] = useState<Request | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (renew: boolean) => {
    setError(null);
    const res = await fetch("/api/credential-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renew }),
    });
    if (!res.ok) {
      setError("Could not start the request. Try again later.");
      return;
    }
    setRequest((await res.json()) as Request);
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const renew = useCallback(() => void load(true), [load]);

  return (
    <main>
      {error ? <p className="error">{error}</p> : null}
      {request?.status === "completed" ? <p>Your EHR is connected.</p> : null}
      {request?.status === "pending" ? (
        <CredentialForm apiUrl={API_URL} token={request.token} onNeedsNewLink={renew} />
      ) : null}
      {!request && !error ? <p className="muted">Loading…</p> : null}
    </main>
  );
}
