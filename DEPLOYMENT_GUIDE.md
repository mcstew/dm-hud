# DM HUD Deployment Guide

**Current status:** live beta at [dmhud.com](https://dmhud.com)

This project is no longer a static-only/localStorage app. It is a Vercel + Supabase application with Auth, PostgreSQL, RLS, RPCs, and Edge Functions.

---

## Production

- Domain: `https://dmhud.com`
- Hosting: Vercel project `dm-hud`
- GitHub repo: `github.com/mcstew/dm-hud`
- Deploy model: pushes to `main` auto-deploy through Vercel
- Supabase project ref: `gfxjwjsgrtkybsamcrwa`

---

## Required Vercel Environment Variables

Set these in the Vercel project:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The anon key is safe for the browser; Supabase RLS and RPC boundaries protect user data.

---

## Required Supabase Edge Function Secrets

Set these in Supabase:

```bash
ANTHROPIC_API_KEY
DEEPGRAM_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Managed beta users consume these server-side keys. BYOK users use their own stored keys.

---

## Local Development

```bash
npm install
npm run dev
```

Local dev defaults to `http://localhost:3000`.

Build check:

```bash
npm run build
```

---

## Deploy Frontend

Normal flow:

```bash
git push origin main
```

Vercel builds and deploys automatically.

Manual Vercel deploys are still possible:

```bash
vercel deploy
vercel --prod
```

---

## Deploy Supabase Functions

Functions live in `supabase/functions/`:

- `ai-process`
- `ai-riff`
- `ai-report`
- `ai-polish`
- `ai-setup`
- `ai-card`
- `get-deepgram-key`

Deploy one function:

```bash
npx supabase functions deploy ai-setup
```

Deploy all changed functions as needed:

```bash
npx supabase functions deploy ai-process
npx supabase functions deploy ai-riff
npx supabase functions deploy ai-report
npx supabase functions deploy ai-polish
npx supabase functions deploy ai-setup
npx supabase functions deploy ai-card
npx supabase functions deploy get-deepgram-key
```

---

## Apply Database Migrations

Migrations live in `supabase/migrations/`.

Current migrations:

- `001_initial_schema.sql`
- `002_reports_table.sql`
- `003_profile_security_usage.sql`
- `004_voice_setup_usage_events.sql`
- `005_card_voice_fill_constraints.sql`

Apply pending migrations with the Supabase CLI:

```bash
npx supabase db push
```

Before applying schema changes to production, check the diff and confirm the target project is the expected Supabase project.

---

## Auth and Beta Operations

Primary join path:

- User signs up at `/login` with email/password.
- Supabase sends the normal email confirmation.
- Profile defaults to `key_mode = 'byok'`.
- User enters Anthropic + Deepgram keys in Tools -> Account.

Managed beta path:

- Superuser opens `/admin/users`.
- Selects a user.
- Toggles Key Mode from `BYOK` to `Managed`.
- Anthropic and Deepgram usage then comes from server-side Supabase secrets.

This is a manual beta comp-tab mechanism, not a billing system. There are no automated quotas or paid tiers yet.

---

## Post-Deploy QA

1. Visit [dmhud.com](https://dmhud.com).
2. Sign in with a real Supabase account.
3. Confirm `/app` loads campaigns.
4. Confirm BYOK settings save.
5. Toggle a test user to Managed in `/admin/users`.
6. Create a new campaign and test the voice setup prompt.
7. Test Voice Fill in manual card creation for at least one character/enemy and one non-character category.
8. Test live transcription and file upload transcription.
9. Check `/admin` stats, user detail, AI logs, and usage events.

---

## Troubleshooting

If AI calls fail:

- BYOK users need valid Anthropic and Deepgram keys in Tools -> Account.
- Managed users require Supabase `ANTHROPIC_API_KEY` and `DEEPGRAM_API_KEY` secrets.
- Check the relevant Supabase Edge Function logs.
- Check `ai_logs` in the admin dashboard for Anthropic function status.

If auth hangs:

- Verify Supabase Site URL is `https://dmhud.com`.
- Verify redirect URLs include `https://dmhud.com/**`.
- Remember the auth provider avoids `getSession()` inside `onAuthStateChange` to prevent deadlocks.

If Vercel routes 404:

- Confirm `vercel.json` has the SPA rewrite.
- Confirm the deployment is using the Vite build output.
