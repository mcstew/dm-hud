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

Real-time audio pipeline: Browser mic → MediaRecorder (WebM/Opus, 250ms chunks) → WebSocket → Deepgram Nova-2

Key Deepgram parameters:
- `interim_results=true` — streams words as recognized (essential for real-time feel)
- `utterance_end_ms=1500` — detects end of speech for buffer flushing
- `vad_events=true` — voice activity detection
- Do NOT specify `encoding` or `sample_rate` — Deepgram auto-detects WebM container format. Specifying them tells Deepgram to expect raw frames, causing decode failures (error 1011).

Audio constraints: `echoCancellation`, `noiseSuppression`, `autoGainControl`, mono channel.

Reliability features:
- **KeepAlive messages** sent every 8s to prevent Deepgram timeout on idle
- **cleanupSession()** called at start of every new session to release previous resources
- **CloseStream** message sent on stop for clean Deepgram shutdown
- **isLiveRef** (ref mirror of state) used in WebSocket closures to avoid stale state

Transcript buffering: finals accumulate in buffer, flushed on UtteranceEnd event, sentence-ending punctuation (300ms delay), or 3s timeout fallback. Interim results shown as live preview below the recording indicator.

**Current status (Feb 21)**: Transcription works but is inconsistent — sometimes takes 5-10s to start producing results, and occasionally produces no output at all in a fresh campaign. Needs further investigation. Possible causes: WebSocket connection timing, MediaRecorder first-chunk delivery, Deepgram cold start. Console logging is now detailed enough to diagnose.

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

## Product Decisions

- **Monetization direction**: BYOK for free tier, managed keys for paid tier(s). Possible structure: $5/mo BYOK sub (app access only), higher rate all-inclusive with managed keys. No immediate changes needed — `key_mode` field is flexible enough. When ready, add `subscription_tier` and `subscription_expires_at` to profiles table.
- **Beta messaging**: BYOK users see a friendly blue "🧪 Beta" callout encouraging them to bring their own keys, with "paid plans with included AI coming soon" copy. This appears in both the Settings panel (Account tab) and the Campaigns home page when keys aren't configured.
- **Landing page**: Basic marketing splash at `/` (dmhud.com). Logged-out users see "Sign In" / "Try for Free". Logged-in users see "Open App". Placeholder for future enhancements (images, testimonials, product screenshots, demo video).

## Session Log — Feb 21, 2025

### Completed
1. **Flipped default key_mode to BYOK** — New signups default to bring-your-own-key. Admin manually toggles beta testers to managed. Updated all 5 Edge Functions, App.jsx, migration schema. Ran live DB migration.
2. **Deployed all 5 Edge Functions** — First-ever deployment. AI features are now live. Used Supabase CLI with access token.
3. **Added beta BYOK callout** — Friendly blue banner in Settings and Campaigns home explaining beta BYOK with "paid plans coming soon" messaging.
4. **Fixed auth loading hang** — Root cause: `getSession()` deadlocks inside `onAuthStateChange` handler. Fix: pass `session.access_token` directly from callback. Also: raw `fetch()` with AbortController for reliable timeouts + retry.
5. **Fixed RLS circular evaluation** — `is_superuser()` in RLS policies caused hangs when evaluated per-row. Fix: wrap in `(SELECT ...)` subselect. Ran migration on live DB.
6. **Fixed admin panel access** — `/admin` was stuck on Loading because profile fetch hung → profile was null → AdminRoute redirected. Fixed by the auth + RLS fixes above.
7. **Optimized real-time transcription** — Enabled `interim_results`, `utterance_end_ms`, `vad_events`. Removed incorrect `encoding`/`sample_rate` params (caused Deepgram error 1011). Added audio constraints, codec validation, live interim preview.
8. **Fixed intermittent transcription failure** — Added KeepAlive messages, session cleanup on fresh start, isLiveRef for stable closures, CloseStream on stop, detailed startup logging.
9. **Added Google Analytics** — G-BF4CM3GY22 in index.html.
10. **Documented everything** — CLAUDE.md updated with auth gotchas, RLS patterns, Deepgram config, product decisions.

### Priority Next Steps
1. **Stabilize live transcription** — Still inconsistent (sometimes works great, sometimes silent). Use the new console logging to diagnose. Check: is it the WebSocket not connecting? MediaRecorder not producing chunks? Deepgram not responding? The logs will tell us. May need to investigate Deepgram API key rate limits or WebSocket connection pooling.
2. **Admin panel QA** — Never been fully tested end-to-end. Users list, AI logs, campaigns overview, stats dashboard all need verification. The key_mode toggle in admin user detail should work now.
3. **Landing page polish** — Current version is text-only. Add product screenshots, feature illustrations, possibly a demo video or animated GIF showing the app in action.
4. **Discord OAuth** — Deferred. Needs Discord application setup and Client ID. Add to Supabase auth providers when ready.
5. **Performance profiling** — AI entity extraction pipeline timing. Are Edge Function cold starts causing delays? Is the Anthropic API response time acceptable?
6. **Transcript quality tuning** — Even when transcription works, accuracy isn't perfect. Consider: Deepgram model selection (nova-2 vs nova-2-general), custom vocabulary for D&D terms, post-processing corrections.
7. **Error UX** — When transcription silently fails, user sees "LIVE - Listening..." with no feedback. Consider adding a "no audio detected" warning after N seconds of silence, or a reconnect button.
