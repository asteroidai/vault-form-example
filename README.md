# Asteroid vault form example

Collect a credential inside your own app. You design the form as a vault template in Asteroid.
This app renders it with plain React and sends the values straight from the browser to Asteroid.
Your servers never see them.

Copy what you need into your codebase. There is no package to install and nothing to keep in sync.

Full guide: https://docs.asteroid.ai/integrate/collect-credentials

## How it works

```
Browser                       Your backend                    Asteroid
   |  POST /api/credential-request  |                              |
   |------------------------------->|  POST /agents/v2/vault/share-links (X-Api-Key)
   |                                |----------------------------->|
   |          { token }             |<------ { link, token } ------|
   |<-------------------------------|                              |
   |  GET  /agents/public_v2/vault/share-link          (X-Share-Token)
   |-------------------------------------------------------------->|
   |  POST /agents/public_v2/vault/share-link/submit   (X-Share-Token)
   |-------------------------------------------------------------->|
```

1. Your backend creates a credential request from a template with your API key. It keeps the
   token next to your user and reuses it until the request completes.
2. Your page reads the form shape and renders the fields, step by step.
3. Your page submits the values. Asteroid creates the vault item and closes the request.

## Run it

```bash
cp .env.example .env.local   # fill in the three ASTEROID_ values
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Where to find it |
| --- | --- |
| `ASTEROID_API_KEY` | Platform, profile picture (bottom left) > **API Keys** |
| `ASTEROID_ORGANIZATION_ID` | `GET https://odyssey.asteroid.ai/agents/v2/context` |
| `ASTEROID_TEMPLATE_ID` | `GET https://odyssey.asteroid.ai/agents/v2/vault/templates?organizationId=...` |

Shell variables win over `.env.local` in Next.js. Unset `ASTEROID_API_KEY` in your shell if you
export one there.

## What to copy

| File | Runs on | What it does |
| --- | --- | --- |
| `lib/vault-form/types.ts` | Browser | Response shapes from the public endpoints |
| `lib/vault-form/api.ts` | Browser | Reads the form and submits the values with the share token |
| `lib/vault-form/fields.ts` | Browser | Field-type to input mapping, validation, value cleanup, step layout |
| `lib/vault-form/CredentialForm.tsx` | Browser | The form. Replace the markup with your own components |
| `lib/asteroid.ts` | Server | Creates, checks and revokes requests with your API key |
| `app/api/credential-request/route.ts` | Server | One request per user, reused until it completes |
| `lib/store.ts` | Server | In-memory token store. Replace it with your database |

`fields.ts` and `api.ts` have no React dependency. Use them from any framework.

## Before you ship

- Replace `currentUser()` in the route with your session lookup.
- Replace `lib/store.ts` with a table keyed by your user ID. Treat the token as a secret.
- Keep `lib/asteroid.ts` server-only. It holds your API key.
- Pick an item name per user that stays unique in your organization. A clash returns `409`.
- Handle `onCompleted` to record that the user connected, then attach the new vault item to an
  agent profile.

## Tests

```bash
npm test          # value cleanup, validation and step layout
npm run typecheck
```
