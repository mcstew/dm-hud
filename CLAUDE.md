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
- Email/password auth enabled. Signup sends Supabase's normal confirmation email; this is not currently a magic-link-only flow.
- Discord OAuth button is wired in the UI, but provider setup should be verified in Supabase before relying on it for launch.

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

- **BYOK by default (beta)**: New users default to `key_mode = 'byok'` and must provide their own Anthropic and Deepgram keys. Admin can toggle trusted beta testers to `managed`, which means DM HUD uses Michael's server-side keys and Michael picks up those AI/transcription costs. Future paid tiers should replace this manual beta switch.
- **AI calls proxied through Edge Functions**: Browser → Supabase Edge Function → Anthropic API. Every AI call is logged to `ai_logs`; app/transcription activity is logged to `usage_events`.
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
- `ai-setup` — Voice-driven campaign setup extraction for roster and campaign arc
- `ai-card` — Voice-driven manual card draft extraction for characters, enemies, locations, items, and plot
- `get-deepgram-key` — Returns Deepgram key based on user's key_mode

## Live Transcription (Deepgram)

Real-time audio pipeline: Browser mic → MediaRecorder (WebM/Opus, 250ms chunks) → WebSocket → Deepgram Nova-3

Key Deepgram parameters:
- `model=nova-3` — current default for live transcription, file upload transcription, and voice setup transcription
- `interim_results=true` — streams words as recognized (essential for real-time feel)
- `utterance_end_ms=1500` — detects end of speech for buffer flushing
- `vad_events=true` — voice activity detection
- `keyterm=<term>` — up to 50 contextual terms from campaign name, roster names/aliases, and active card names
- Do NOT specify `encoding` or `sample_rate` — Deepgram auto-detects WebM container format. Specifying them tells Deepgram to expect raw frames, causing decode failures (error 1011).

Audio constraints: `echoCancellation`, `noiseSuppression`, `autoGainControl`, mono channel.

Reliability features:
- **KeepAlive messages** sent every 8s to prevent Deepgram timeout on idle
- **cleanupSession()** called at start of every new session to release previous resources
- **CloseStream** message sent on stop for clean Deepgram shutdown
- **isLiveRef** (ref mirror of state) used in WebSocket closures to avoid stale state

Transcript buffering: finals accumulate in buffer, flushed on UtteranceEnd event, sentence-ending punctuation (300ms delay), or 3s timeout fallback. Interim results shown as live preview below the recording indicator.

Live transcription intentionally does not request diarization right now because the app treats live transcript chunks as the DM narration stream. Uploaded audio still requests Deepgram paragraphs and `diarize_model=latest`.

**Current status (Jun 3, 2026)**: Live transcription now uses Nova-3 and keyterms. This should help D&D/campaign vocabulary, but startup reliability and real-world session QA still need attention before launch.

## Database

Schema in `supabase/migrations/001_initial_schema.sql`. Tables:
- `profiles` — extends auth.users (key_mode, is_superuser, etc.)
- `campaigns`, `sessions`, `cards`, `player_roster`, `transcript_entries`, `events`, `ai_logs`, `usage_events`
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
- **Landing page**: Marketing page at `/` (dmhud.com) with hero image, problem section, feature cards, dice divider, and CTA. Logged-out users see "Sign In" / "Try for Free". Logged-in users see "Open App". Uses reference photos from the DM's own table (stored in `public/images/`). Social share card uses `og-hero.jpg` (DM screen + character sheets photo).

## Beta Operations

- Public users join through `/login` with email/password signup and default to BYOK.
- BYOK users enter Anthropic and Deepgram keys in Tools → Account.
- Superusers can open `/admin/users`, select a user, and toggle Key Mode from `BYOK` to `Managed`.
- `Managed` is the beta comp-tab mode: Anthropic calls use the Supabase `ANTHROPIC_API_KEY` secret and Deepgram calls use the Supabase `DEEPGRAM_API_KEY` secret.
- There is usage visibility but no hard quota, billing tier, or automated shutoff yet.

## Session Log — Jun 3, 2026

### Completed
1. **Switched transcription to Deepgram Nova-3** — Shared helper now uses `nova-3` for live, file upload, and voice setup transcription. Live transcription adds contextual `keyterm` parameters and no longer requests unused live diarization.
2. **Added voice campaign setup** — New campaigns prompt the DM to configure roster and arc by voice. Roster and Arc modals also have Voice Fill buttons. The review step lets the DM edit the transcript-derived roster and arc before saving.
3. **Added `ai-setup` Edge Function** — Extracts player roster and campaign arc from a free-form setup transcript using `claude-haiku-4-5`, verifies campaign ownership, resolves BYOK vs managed keys, and logs to `ai_logs`.
4. **Improved roster merging** — Voice setup merges partial existing roster rows and avoids duplicate rows when a player/character is clarified later.
5. **Fixed roster temp IDs** — Client-generated IDs no longer get sent as invalid UUID updates; non-UUID roster entries insert cleanly.
6. **Updated Claude model alias** — `ai-polish` now uses the stable `claude-haiku-4-5` alias like the other Edge Functions.
7. **Added usage-event support for setup transcription** — `setup_transcription_seconds` and `setup_transcription_upload` are now part of the usage event taxonomy.

## Session Log — Jun 4, 2026

### Completed
1. **Added manual-card Voice Fill** — The manual create modal now supports voice fill for characters, combat enemies, locations, items, and plot threads. It records a short clip, transcribes with Deepgram Nova-3/keyterms, fills the modal fields, and stores the voice transcript as the card genesis when created.
2. **Added `ai-card` Edge Function** — Extracts one conservative card draft from a spoken description using `claude-haiku-4-5`, verifies campaign ownership, resolves BYOK vs managed keys, and logs as `card_voice_fill`.
3. **Expanded logging constraints** — `ai_logs` now allows `campaign_setup` and `card_voice_fill`; `usage_events` now allows card voice transcription events.
4. **Admin visibility** — Admin AI log filters and user usage labels now include campaign setup and card voice fill activity.

### Priority Next Steps
1. **Authenticated QA pass** — Test full signup/login, BYOK key entry, managed toggle, voice setup, live transcription, uploads, admin logs, and Vercel production behavior with a real Supabase session.
2. **Quota/billing design** — If managed mode becomes a paid plan, add subscription fields, monthly transcription/AI limits, and a user-facing usage meter.
3. **Combat duplicate reconciliation** — Continue improving batch/entity reconciliation for plural enemies and late clarifications.
4. **Discord OAuth decision** — Either finish provider setup or hide/remove the Discord button before launch.
5. **Launch docs/storytelling** — Update external-facing copy once the beta operations model and managed-plan language are settled.

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
6. **Transcript quality tuning** — Even when transcription works, accuracy isn't perfect. Continue evaluating Deepgram model settings, keyterms, D&D vocabulary handling, and post-processing corrections.
7. **Error UX** — When transcription silently fails, user sees "LIVE - Listening..." with no feedback. Consider adding a "no audio detected" warning after N seconds of silence, or a reconnect button.

## Session Log — Feb 28, 2025

### Completed
1. **SEO pass on landing page** — Added comprehensive meta tags to `index.html`: title optimized with keywords, meta description, keywords, canonical URL, Open Graph (og:title, og:description, og:image, og:type, og:site_name, og:image:width/height), Twitter Card (summary_large_image), robots directive, application-name, and theme-color.
2. **Structured data (JSON-LD)** — Added `SoftwareApplication` schema to `Landing.jsx` with name, description, features list, and free pricing. Injected via `dangerouslySetInnerHTML` script tag.
3. **Semantic HTML improvements** — Wrapped landing page content sections in `<main>`, added `aria-label` to nav, `aria-labelledby` on all sections with corresponding heading IDs (`hero-heading`, `problem-heading`, `features-heading`, `cta-heading`).
4. **Favicon — d6 dice icon** — Created custom SVG favicon based on Tabler Icons `dice-6` with the brand indigo gradient fill and light pips. Generated PNG variants at 180px (Apple touch icon), 192px, and 512px using `sharp-cli`. Replaced default Vite favicon.
5. **Static SEO assets** — Created `public/` directory with: `robots.txt` (allows `/`, blocks `/app/` and `/admin/`, points to sitemap), `sitemap.xml` (lists `/` and `/login`), `site.webmanifest` (PWA manifest with app name, theme color, icon references).
6. **Landing page images** — Optimized three reference photos for web (60-127KB each via sharp-cli): `og-hero.jpg` (DM table with character sheets, DM screen, map — used as hero image and OG/Twitter social card), `dice-banner.jpg` (polyhedral dice panoramic — used as visual divider between Problem and Features sections), `sheet-notes.jpg` (handwritten character sheet — kept in `public/images/` for future use but removed from page after visual review).
7. **Social share card** — Updated OG and Twitter meta tags to use `og-hero.jpg` instead of favicon. Changed Twitter card type from `summary` to `summary_large_image` for bigger previews on Twitter/Slack/Discord.

### Decisions
- **Favicon approach**: Went with a simple, clean d6 using the Tabler Icons library (which the project already uses) rather than a complex custom illustration. Brand indigo gradient keeps it on-theme.
- **Image hosting**: Images stored in `public/` directory, served by Vercel's edge CDN as static files. No external image service needed at current scale (~270KB total).
- **Sheet image removed**: The handwritten character sheet photo (`sheet-notes.jpg`) was initially placed in the Problem section but removed — looked visually heavy back-to-back with the dice banner. Kept in `public/images/` for potential future use (e.g., a dedicated "how it works" page or blog post).
- **robots.txt strategy**: `/app/` and `/admin/` blocked from crawling. Both are behind auth anyway, but the robots.txt serves as a signal to well-behaved bots.
- **Reference images not committed**: The `reference/` folder (original high-res source photos) is not tracked in git. Only the optimized web versions in `public/images/` are committed.

### Files Changed
- `index.html` — Full SEO meta tags, favicon links, OG/Twitter cards
- `src/components/Landing.jsx` — JSON-LD, semantic HTML, hero image, dice divider
- `public/favicon.svg` — New d6 dice icon (Tabler-style)
- `public/favicon-192.png`, `public/favicon-512.png`, `public/apple-touch-icon.png` — PNG variants
- `public/robots.txt`, `public/sitemap.xml`, `public/site.webmanifest` — SEO assets
- `public/images/og-hero.jpg`, `public/images/dice-banner.jpg`, `public/images/sheet-notes.jpg` — Optimized photos

### Priority Next Steps (updated)
1. **Stabilize live transcription** — Still the #1 issue from Feb 21. Inconsistent startup, sometimes silent.
2. **Admin panel QA** — Never fully tested end-to-end.
3. **Landing page enhancements** — Consider: app screenshots/demo GIF, testimonials, "how it works" walkthrough, the sheet-notes photo could fit a future section.
4. **Discord OAuth** — Deferred. Needs Discord application setup.
5. **Performance profiling** — Edge Function cold starts, AI pipeline timing.
6. **Transcript quality tuning** — Deepgram model selection, D&D vocabulary.
7. **Error UX** — "No audio detected" warning, reconnect button.
8. **App.jsx decomposition** — Main file is 2,258 lines. Consider extracting components/hooks when making changes in that area.
