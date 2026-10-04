# Cadence

A Discord-style chat app — servers, channels, roles, permissions, DMs, friends and
live messaging — built with React, Tailwind and Supabase.

The marketing site lives at `/`, and the app at `/app`.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com/dashboard) and create a project.
2. Open **SQL Editor → New query**.
3. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and run it.

That one script creates every table, enables Row Level Security, installs the
permission functions, creates the storage buckets, and registers the tables for
Realtime. It is idempotent, so re-running it is safe.

## 2. Add your environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Where to find it |
| --- | --- |
| `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → anon / publishable key |

```bash
cp .env.example .env.local
```

Only the **anon** key belongs here. Never put the `service_role` key in a `VITE_`
variable — those ship to the browser. Row Level Security is what protects your data.

### On Netlify

Site settings → Environment variables → add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy. No other configuration is needed — the app is fully static and
talks to Supabase directly.

> **Note on the committed defaults**
> `src/lib/supabase.ts` ships this project's URL and anon key as fallback
> defaults, so the app runs in any preview without extra setup. The Supabase
> anon key is a *publishable* key by design — it is not a secret, and RLS is
> what actually protects your data. Environment variables always take
> precedence, so you can point the app at a different project without touching
> the code.
>
> If Supabase ever returns `Invalid API key`, the key has been rotated: copy
> the current one from **Settings → API** and update `VITE_SUPABASE_ANON_KEY`
> (and the fallback constant).

## 3. Auth settings

By default Supabase may require email confirmation. To make local testing
frictionless, go to **Authentication → Sign In / Providers → Email** and either
disable *Confirm email* or leave it on (users then confirm via the email link).

Google sign-in is wired up in the UI. To enable it, add a Google provider under
the same page and whitelist your domain in the redirect URLs.

## 4. Run it

```bash
npm install
npm run dev
```

## Features

**Accounts** — email + password, Google OAuth, profile with display name,
username, about, custom status and avatar upload. Everyone gets a deterministic
gradient avatar generated from their id, so nobody is ever blank.

**Servers** — create, join via invite code, rename, leave, delete. An invite
link can be generated and revoked from the server menu.

**Channels** — text channels with topics, create / rename / delete / reorder.

**Roles & permissions** — Discord's exact model. Every role is a bigint
bitmask; channel overwrites are `deny`-then-`allow`. The full bitmask is
resolved in Postgres (`channel_permission()`) so RLS is accurate, and mirrored
in `src/lib/permissions.ts` for the UI.

**Messaging** — realtime via Supabase Realtime, paginated history, edit,
delete, replies, emoji reactions and typing indicators.

**DMs** — one-to-one direct messages, discoverable from the friend list, member
list, or any profile.

**Friends** — search the directory by username or display name, send requests,
accept / decline, remove, and block.

**Presence** — live online / idle / do-not-disturb dots across the member list,
DM list and profiles.

## Project layout

```
supabase/schema.sql          the entire database schema
src/lib/supabase.ts          client + "is it configured" guard
src/lib/permissions.ts       bitmask constants and helpers
src/lib/avatar.ts            deterministic generated avatars
src/hooks/useAuth.tsx        session + profile context
src/hooks/useCadenceData.ts  servers, channels, members, DMs
src/hooks/useMessages.ts     message history + realtime
src/hooks/usePresence.ts     presence and typing indicators
src/components/app/          the app shell
src/components/landing/      the marketing site at /
```

## Not built yet

Voice/video channels, group DMs, threads, server templates, and moderation
queues beyond kick/ban. The schema leaves room for all of them.
