# DM HUD - Dungeon Master Heads-Up Display

**Version:** 0.9.0
**Status:** Live Beta at [dmhud.com](https://dmhud.com)

---

## Overview

A real-time AI-powered assistant for running D&D 5.5e campaigns. DM HUD listens to your session, automatically tracks characters, locations, items, and plot threads, and gives you AI-powered tools to run better games.

### The Problem

Running a D&D session requires DMs to simultaneously track NPCs, locations, combat state, and narrative consistency — all while improvising. Most DMs rely on scattered notes and memory. Important details get lost, named NPCs get forgotten, and improvised content contradicts earlier canon.

### The Solution

DM HUD acts as an always-listening second brain:
1. **Live transcription** captures everything said at the table via Deepgram
2. **AI entity extraction** automatically creates trackable cards for characters, locations, items, and plot threads
3. **Real-time state tracking** manages HP, conditions, hostility, and combat status
4. **Character milestones** records rolls, checks, discoveries, and story moments
5. **AI-generated riffs** suggest details the DM hasn't established yet
6. **Session reports** produce polished recaps with highlights, quotes, and MVP awards

---

## Tech Stack

- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3.4
- **Icons:** Tabler Icons React (`@tabler/icons-react`, 2px stroke)
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions + RLS)
- **AI:** Claude Haiku 4.5 (entity extraction, riffs, reports, transcript polishing)
- **Transcription:** Deepgram Nova-2 (real-time WebSocket streaming with speaker diarization)
- **Hosting:** Vercel (auto-deploys from GitHub `main`)
- **Domain:** dmhud.com
- **Analytics:** Google Analytics (G-BF4CM3GY22)

---

## Features

### Live Audio Transcription
- Real-time speech-to-text via Deepgram Nova-2 WebSocket
- Intelligent buffering prevents incomplete sentence extraction
- Speaker diarization (DM vs Players)
- File upload support for pre-recorded sessions
- Smart transcript export with AI polishing

### AI-Powered Entity Tracking
- Automatic extraction of characters, locations, items, and plot threads
- HP and condition detection from natural speech
- D&D 5.5e stats capture (ability scores, AC, level, class)
- Smart deduplication (e.g., "the barmaid introduces herself as Greta" updates existing entity)

### Canon vs. Riff System
- **Canon** = established truth (solid borders, emerald accents)
- **Riff** = AI-generated suggestions (dashed borders, amber accents)
- One click canonizes a riff into established fact

### Smart Card System
- Unified CHARACTER system (PCs, NPCs, monsters all consistent)
- Dynamic hostility flags, combat state auto-switching
- Drag & drop reordering, inline HP/stats editing
- Exploration mode (4 columns) and Combat mode (2 columns)

### Character Events & Milestones
- Automatic tracking of ability checks, saves, attacks, discoveries, level-ups
- Color-coded event feed per character
- Stored per-session with timestamps

### Session Reports
- AI-generated summaries with narrative recap, MVP, highlights, quotes, timeline
- Export to Markdown

### Campaign Management
- Multi-session support with session archives
- Player roster (real name to character name mapping)
- Campaign arc (DM-only secrets that inform AI suggestions)

### The Void
- Deleted cards go to The Void instead of permanent deletion
- Restore or permanently delete from Void panel

### Unified Tools Panel
- Account tab: API key management, status indicators
- Campaign tab: full transcript export, campaign-level reports
- Session tab: session transcript export, session reports

---

## Architecture

### Routing
- `/` — Public landing page
- `/login` — Auth (redirects to `/app` if logged in)
- `/app/*` — Protected app (requires auth)
- `/admin/*` — Admin panel (requires superuser)

### Project Structure
```
dm-hud/
├── src/
│   ├── App.jsx              # Main application (dashboard, cards, transcription)
│   ├── main.jsx             # React entry point
│   ├── index.css            # Tailwind imports + custom scrollbars
│   ├── admin/               # Admin panel components
│   │   ├── AdminPanel.jsx
│   │   ├── StatsView.jsx
│   │   ├── UsersView.jsx
│   │   ├── AILogsView.jsx
│   │   └── CampaignsView.jsx
│   ├── components/
│   │   ├── Landing.jsx      # Public landing page
│   │   ├── Auth.jsx         # Login/signup
│   │   └── ProtectedRoute.jsx
│   ├── hooks/
│   │   └── useCampaign.js
│   └── lib/
│       ├── auth.jsx         # Supabase auth provider
│       ├── supabase.js      # Supabase client
│       ├── ai.js            # AI service calls
│       ├── db.js            # Database operations
│       └── mappers.js       # snake_case <-> camelCase
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/           # Edge Functions
│       ├── ai-process/      # Entity extraction
│       ├── ai-riff/         # Riff generation
│       ├── ai-report/       # Session reports
│       ├── ai-polish/       # Transcript polishing
│       └── get-deepgram-key/
├── public/
│   ├── favicon.svg          # d6 dice icon (Tabler-style)
│   ├── favicon-192.png
│   ├── favicon-512.png
│   ├── apple-touch-icon.png
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── site.webmanifest
│   └── images/
│       ├── og-hero.jpg      # Social share card + hero image
│       ├── dice-banner.jpg  # Landing page divider
│       └── sheet-notes.jpg  # Reserved for future use
├── index.html               # Entry HTML with SEO meta tags
├── package.json
├── vite.config.js
├── tailwind.config.js
├── vercel.json              # SPA rewrite rules
├── CLAUDE.md                # Infrastructure notes + session logs
├── CHANGELOG.md
└── README.md
```

### Database (Supabase PostgreSQL)
- `profiles` — extends auth.users (key_mode, is_superuser)
- `campaigns` — user-owned campaigns
- `sessions` — campaign sessions
- `cards` — entity cards (type, name, notes, flags, hp, stats, riffs, canonFacts)
- `player_roster` — player name mappings
- `transcript_entries` — session transcripts
- `events` — character milestones
- `ai_logs` — AI call audit trail
- RLS enabled on all tables

### Edge Functions
- `ai-process` — Main entity extraction from transcript
- `ai-riff` — Generate riff suggestions
- `ai-report` — Generate session/campaign reports
- `ai-polish` — Polish transcripts
- `get-deepgram-key` — Return Deepgram key based on user's key_mode

---

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Local Development
```bash
npm install
npm run dev
```
Opens at http://localhost:3000

### Configuration
1. Create an account at [dmhud.com](https://dmhud.com) (or run locally)
2. Go to the Tools panel > Account tab
3. Enter your Anthropic API key (`sk-ant-...`)
4. Enter your Deepgram API key
5. Save

### Build
```bash
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

---

## Current Status

### Working
- Multi-user auth (Supabase email/password)
- Multi-campaign and multi-session management
- Entity card CRUD with all card types
- HP, conditions, and stats tracking
- Exploration/Combat mode switching
- AI entity extraction, riff generation, session reports
- Live real-time audio transcription (Deepgram WebSocket)
- File upload transcription
- Smart transcript export with AI polishing
- The Void (soft-delete graveyard)
- Admin panel (users, AI logs, campaigns, stats)
- Landing page with SEO, OG/Twitter cards, structured data
- Custom d6 favicon, robots.txt, sitemap, web manifest

### Known Limitations
- Live transcription can be inconsistent on startup
- No export/import of campaign data
- No undo/redo
- No collaborative/multiplayer support
- No VTT integrations (Roll20, Foundry, etc.)
- AI occasionally misses entities or creates duplicates
- Speaker diarization is imperfect

---

## Acknowledgments

- Built with [Claude](https://claude.ai) AI assistance
- Powered by [Anthropic](https://anthropic.com) and [Deepgram](https://deepgram.com)
- Inspired by the D&D community's need for better DM tools
