# DM HUD - Current Handoff

**Last updated:** June 3, 2026 evening
**Status:** Live beta at [dmhud.com](https://dmhud.com)
**Repo:** `github.com/mcstew/dm-hud`

---

## Project Snapshot

DM HUD is a real-time AI assistant for running D&D 5.5e campaigns. It listens to session audio, transcribes DM narration, extracts characters/locations/items/plot threads, tracks combat and character state, and generates riffs/reports.

The app is now a Supabase-backed multi-user beta, not the old localStorage/static-only prototype.

---

## Current Stack

- Frontend: React 18, Vite 5, Tailwind CSS, Tabler Icons
- Hosting: Vercel, auto-deploying from GitHub `main`
- Backend: Supabase PostgreSQL, Auth, RLS, RPCs, Edge Functions
- AI: Anthropic `claude-haiku-4-5`
- Transcription: Deepgram `nova-3`
- Domain: `dmhud.com`
- Analytics: Google Analytics `G-BF4CM3GY22`

---

## Join, Auth, and Key Modes

Primary login is Supabase email/password signup with email confirmation. This is not currently a Supabase magic-link flow.

New users default to BYOK:
- `profiles.key_mode = 'byok'`
- They must enter their own Anthropic and Deepgram API keys in Tools -> Account.

Admins can toggle trusted beta testers to Managed:
- Go to `/admin/users`
- Select the user
- Toggle Key Mode from `BYOK` to `Managed`
- Managed users use server-side Supabase secrets, so Michael pays their Anthropic and Deepgram usage.

There is admin usage visibility but no quota, Stripe billing, subscription tier, or automatic shutoff yet.

Discord OAuth is wired in the UI but should be verified or hidden before launch.

---

## Important Docs

- `CLAUDE.md` - best living project memory: infra, auth gotchas, beta operations, session logs, next steps
- `README.md` - public-facing project overview and architecture
- `CHANGELOG.md` - release/change history
- `DEPLOYMENT_GUIDE.md` and `DEPLOYMENT_SUCCESS.md` - older deployment references; useful historically, less authoritative than `CLAUDE.md`

---

## Supabase Edge Functions

Located in `supabase/functions/`.

- `ai-process` - main transcript entity extraction
- `ai-riff` - riff generation
- `ai-report` - session/campaign reports
- `ai-polish` - transcript polishing
- `ai-setup` - voice roster/arc setup extraction
- `ai-card` - voice manual-card draft extraction
- `get-deepgram-key` - resolves Deepgram key based on BYOK vs Managed mode

All Anthropic functions resolve keys server-side based on `profiles.key_mode`. Managed mode uses the Supabase `ANTHROPIC_API_KEY` secret; BYOK mode uses the user's stored key.

---

## Recent June 3 Work

- Switched Deepgram from Nova-2 to Nova-3.
- Added contextual Deepgram keyterms from campaign, roster, aliases, and active cards.
- Removed unused live diarization to keep live transcription costs saner.
- Added voice campaign setup prompt after creating a campaign.
- Added Voice Fill buttons in roster and arc modals.
- Added `ai-setup` Edge Function for transcript-to-roster/arc extraction.
- Added Voice Fill to manual card creation across characters, combat enemies, locations, items, and plot.
- Added `ai-card` Edge Function for transcript-to-card draft extraction.
- Improved roster merge behavior for voice setup clarifications.
- Fixed roster upserts for client-generated temporary IDs.
- Added usage-event types for setup transcription.
- Added usage-event types for card voice transcription.
- Updated `ai-polish` to use `claude-haiku-4-5`.

---

## Current Known Risks

- Authenticated QA still needs a full real-account pass: signup, BYOK key entry, managed toggle, voice setup, manual card voice fill, live session, upload transcription, admin logs.
- AI can still create duplicate entities in some incremental processing cases, especially plural enemies clarified later.
- Managed beta mode is a manual comp-tab switch, not a paid plan or quota system.
- Live transcription currently treats audio as DM narration; uploaded audio can use diarization, but diarization remains imperfect.
- Discord OAuth may not be production-ready despite the visible login button.

---

## Development Commands

```bash
npm install
npm run dev
npm run build
```

Local dev defaults to `http://localhost:3000`.

Deployments:
- Vercel deploys from `main`.
- Supabase functions deploy with `npx supabase functions deploy <name>`.
- Database changes live in `supabase/migrations/`.

---

## Recommended Next Pass

1. Run an authenticated production QA pass with a real test account.
2. Decide whether Discord OAuth should ship or be hidden.
3. Add usage quotas/subscription fields before offering paid Managed mode.
4. Keep improving entity reconciliation for duplicates and plural combatants.
5. Polish launch messaging around beta/BYOK/Managed expectations.
