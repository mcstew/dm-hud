# DM HUD Deployment Status

**Current production:** [dmhud.com](https://dmhud.com)
**Hosting:** Vercel
**Backend:** Supabase project `gfxjwjsgrtkybsamcrwa`
**Repo:** `github.com/mcstew/dm-hud`

---

## What Is Live

- Public landing page at `/`
- Auth at `/login`
- Protected app at `/app`
- Admin dashboard at `/admin`
- Supabase-backed campaigns, sessions, cards, roster, events, transcripts, AI logs, and usage events
- Supabase Edge Functions for AI and managed-key access
- Deepgram Nova-3 transcription
- Claude Haiku 4.5 AI workflows
- Voice-driven setup and manual card drafting

---

## Current Production Architecture

- Vercel deploys the React/Vite frontend from GitHub `main`.
- Supabase handles Auth, PostgreSQL, RLS, RPCs, and Edge Functions.
- BYOK users provide their own Anthropic and Deepgram keys.
- Managed beta users use server-side Supabase secrets, so Michael pays for their AI/transcription usage.
- Admin views provide user list, user detail, campaigns, AI logs, stats, and usage visibility.

---

## Current Feature Status

Working:

- Multi-user auth with email/password signup
- BYOK by default
- Admin BYOK/Managed key-mode toggle
- Multi-campaign and multi-session management
- Entity tracking for characters, locations, items, and plot
- Combat/exploration modes
- HP and stats management
- Character events and milestones
- Riff generation
- Session/campaign reports
- Live Deepgram Nova-3 transcription
- File upload transcription
- Voice setup for roster and campaign arc
- Voice Fill for manual card creation across card categories
- The Void soft-delete flow

Known risks:

- Full authenticated production QA still needs another real-account pass.
- Managed mode has observability but no quotas, billing tiers, or automatic shutoff.
- AI can still produce duplicate entities in some plural/clarification cases.
- Live transcription treats audio as DM narration; uploaded-audio diarization is still imperfect.
- Discord OAuth is visible in the UI but should be verified or hidden before launch.

---

## Operational Notes

Most current project context lives in:

- `CLAUDE.md`
- `README.md`
- `CHANGELOG.md`
- `HANDOFF.md`
- `DEPLOYMENT_GUIDE.md`

Deploy frontend changes by pushing to `main`.

Deploy Supabase function changes with:

```bash
npx supabase functions deploy <function-name>
```

Apply DB migrations with:

```bash
npx supabase db push
```

---

## Launch Reminder

Before a broader announcement, do one complete pass through:

1. Fresh signup and email confirmation
2. BYOK key entry
3. Managed user toggle
4. New campaign voice setup
5. Manual card Voice Fill
6. Live transcription
7. File upload transcription
8. Admin usage and AI logs
9. Production Vercel deployment state
