# DM HUD — Project Notes

## Infrastructure

- **Domain**: dmhud.com (purchased Feb 2025, DNS pointed to Vercel)
- **Hosting**: Vercel (project: dm-hud, auto-deploys from GitHub main)
- **Backend**: Supabase (project: "DM Hud" in "Michael Projects" org)
  - URL: https://gfxjwjsgrtkybsamcrwa.supabase.co
  - Uses new-format publishable key (`sb_publishable_...`), not legacy JWT anon key
- **Repo**: github.com/mcstew/dm-hud

## Supabase Auth Config

- **Site URL**: must be set to `https://dmhud.com` in Supabase → Authentication → URL Configuration
- **Redirect URLs**: should include `https://dmhud.com/**` and optionally `https://dm-hud.vercel.app/**`
- Discord OAuth: deferred (needs Discord Client ID setup)
- Email/password auth enabled

## Environment Variables

### Vercel (set in dashboard)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable key (safe for browser, RLS protects data)

### Supabase Edge Function Secrets (set in Supabase dashboard)
- `ANTHROPIC_API_KEY` — for managed-key AI calls
- `DEEPGRAM_API_KEY` — for managed-key transcription
- `SUPABASE_SERVICE_ROLE_KEY` — for Edge Functions to bypass RLS when logging

## Routing

- `/` — Public landing page
- `/login` — Auth (redirects to /app if logged in)
- `/app/*` — Protected app (requires auth)
- `/admin/*` — Admin panel (requires superuser)

## Key Architecture Decisions

- **BYOK by default**: New users must provide their own API keys. Admin can toggle trusted beta testers to "managed" mode (uses owner's keys).
- **AI calls proxied through Edge Functions**: Browser → Supabase Edge Function → Anthropic API. Every call logged to `ai_logs` table.
- **Optimistic updates**: React state updates immediately, Supabase writes happen async.
- **Mapper pattern**: DB uses snake_case, frontend uses camelCase. Mappers in `src/lib/mappers.js`.

## Edge Functions (not yet deployed)

Located in `supabase/functions/`. Need to be deployed via Supabase CLI:
- `ai-process` — Main entity extraction
- `ai-riff` — Riff generation
- `ai-report` — Session report generation
- `ai-polish` — Transcript polishing
- `get-deepgram-key` — Returns Deepgram key based on user's key_mode

## Database

Schema in `supabase/migrations/001_initial_schema.sql`. Tables:
- `profiles` — extends auth.users (key_mode, is_superuser, etc.)
- `campaigns`, `sessions`, `cards`, `player_roster`, `transcript_entries`, `events`, `ai_logs`
- RLS enabled on all tables with helper functions `is_superuser()` and `campaign_owner()`
- `handle_new_user` trigger auto-creates profile on signup

## Superuser Access

To make a user superuser, run in Supabase SQL Editor:
```sql
update profiles set is_superuser = true where email = 'user@example.com';
```
