# DM HUD — Project Notes

## Infrastructure

- **Domain**: dmhud.com (purchased Feb 2025, DNS pointed to Vercel)
- **Hosting**: Vercel (project: dm-hud, auto-deploys from GitHub main)
- **Backend**: Supabase (project: "DM Hud" in "Michael Projects" org)
  - URL: https://gfxjwjsgrtkybsamcrwa.supabase.co
  - Project ref: `gfxjwjsgrtkybsamcrwa`
  - Uses new-format publishable key (`sb_publishable_...`), not legacy JWT anon key
- **Repo**: github.com/mcstew/dm-hud
- **Analytics**: Google Analytics (G-BF4CM3GY22) — added to index.html

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

- `/` — Public landing page (Landing.jsx)
- `/login` — Auth (redirects to /app if logged in)
- `/app/*` — Protected app (requires auth)
- `/admin/*` — Admin panel (requires superuser)

## Key Architecture Decisions

- **BYOK by default (beta)**: New users must provide their own API keys. Admin can toggle trusted beta testers to "managed" mode (uses owner's keys). Future: paid tiers will replace this — e.g. free/BYOK tier, paid "all-inclusive" tier with managed keys. The `key_mode` text field on profiles is already flexible enough to support new values (e.g. 'pro', 'free'). When productizing, add `subscription_tier` and/or `subscription_expires_at` to profiles.
- **AI calls proxied through Edge Functions**: Browser → Supabase Edge Function → Anthropic API. Every call logged to `ai_logs` table.
- **Optimistic updates**: React state updates immediately, Supabase writes happen async.
- **Mapper pattern**: DB uses snake_case, frontend uses camelCase. Mappers in `src/lib/mappers.js`.

## Auth System

The auth provider (`src/lib/auth.jsx`) uses `onAuthStateChange` as the sole source of truth:
- Handles `INITIAL_SESSION` and `SIGNED_IN` events
- Profile is fetched via raw `fetch()` to PostgREST (not Supabase JS client) for reliable abort/timeout
- Access token is passed directly from the `onAuthStateChange` callback (never re-fetched via `getSession()` which can deadlock during auth state transitions)
- Automatic retry (up to 3 attempts) if profile fetch fails or times out
- 15-second safety timeout forces loading to false as last resort

**Known gotcha**: Calling `supabase.auth.getSession()` inside an `onAuthStateChange` handler can deadlock. Always use the `session` parameter from the callback.

## RLS Policies

All RLS policies that reference `is_superuser()` must wrap it in a subselect: `(SELECT public.is_superuser())`. Bare function calls can cause circular evaluation hangs because Postgres evaluates them per-row, and `is_superuser()` queries the `profiles` table which has RLS policies that call `is_superuser()`. The subselect lets Postgres evaluate once and cache.

Both helper functions must be owned by `postgres` for `SECURITY DEFINER` to bypass RLS:
```sql
ALTER FUNCTION public.is_superuser() OWNER TO postgres;
ALTER FUNCTION public.campaign_owner(uuid) OWNER TO postgres;
```

## Edge Functions (deployed)

Located in `supabase/functions/`. Deployed via Supabase CLI:
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy <name> --no-verify-jwt
```
- `ai-process` — Main entity extraction
- `ai-riff` — Riff generation
- `ai-report` — Session report generation
- `ai-polish` — Transcript polishing
- `get-deepgram-key` — Returns Deepgram key based on user's key_mode

## Live Transcription (Deepgram)

Real-time audio pipeline: Browser mic → MediaRecorder (WebM/Opus, 500ms chunks) → WebSocket → Deepgram Nova-2

Key Deepgram parameters:
- `interim_results=true` — streams words as recognized (essential for real-time feel)
- `utterance_end_ms=1500` — detects end of speech for buffer flushing
- `vad_events=true` — voice activity detection
- Do NOT specify `encoding` or `sample_rate` — Deepgram auto-detects WebM container format. Specifying them tells Deepgram to expect raw frames, causing decode failures (error 1011).

Audio constraints: `echoCancellation`, `noiseSuppression`, `autoGainControl`, mono, 16kHz ideal sample rate.

Transcript buffering: finals accumulate in buffer, flushed on UtteranceEnd event, sentence-ending punctuation (300ms delay), or 3s timeout fallback. Interim results shown as live preview below the recording indicator.

## Database

Schema in `supabase/migrations/001_initial_schema.sql`. Tables:
- `profiles` — extends auth.users (key_mode, is_superuser, etc.)
- `campaigns`, `sessions`, `cards`, `player_roster`, `transcript_entries`, `events`, `ai_logs`
- RLS enabled on all tables with helper functions `is_superuser()` and `campaign_owner()`
- `handle_new_user` trigger auto-creates profile on signup
- Default `key_mode` is `'byok'` (changed from `'managed'` for public beta)

## Superuser Access

To make a user superuser, run in Supabase SQL Editor:
```sql
UPDATE profiles SET is_superuser = true WHERE email = 'user@example.com';
```

To also give them managed keys:
```sql
UPDATE profiles SET is_superuser = true, key_mode = 'managed' WHERE email = 'user@example.com';
```

## Session Log — Feb 21, 2025

### Completed
1. **Flipped default key_mode to BYOK** — New signups default to bring-your-own-key. Admin manually toggles beta testers to managed. Updated all 5 Edge Functions, App.jsx, migration schema.
2. **Deployed all 5 Edge Functions** — First-ever deployment. AI features are now live. Used Supabase CLI with access token.
3. **Added beta BYOK callout** — Friendly blue banner in Settings and Campaigns home explaining beta BYOK with "paid plans coming soon" messaging.
4. **Fixed auth loading hang** — Root cause: `getSession()` deadlocks inside `onAuthStateChange` handler. Fix: pass `session.access_token` directly from callback. Also: raw `fetch()` with AbortController for reliable timeouts + retry.
5. **Fixed RLS circular evaluation** — `is_superuser()` in RLS policies caused hangs when evaluated per-row. Fix: wrap in `(SELECT ...)` subselect. Ran migration on live DB.
6. **Fixed admin panel access** — `/admin` was stuck on Loading because profile fetch hung → profile was null → AdminRoute redirected. Fixed by the auth + RLS fixes above.
7. **Optimized real-time transcription** — Enabled `interim_results`, `utterance_end_ms`, `vad_events`. Removed incorrect `encoding`/`sample_rate` params (caused Deepgram error 1011). Added audio constraints, codec validation, 500ms chunks, live interim preview.
8. **Added Google Analytics** — G-BF4CM3GY22 in index.html.

### Outstanding / Next Steps
- Test transcription quality with the new Deepgram params
- Admin panel QA (never been fully tested — users list, AI logs, campaigns, stats views)
- Discord OAuth setup (deferred)
- Performance profiling of AI entity extraction pipeline
- Landing page enhancements (images, testimonials, etc.)
