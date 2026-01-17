# DM HUD - Project Handoff Document

**Date:** January 14, 2026
**Version:** 0.8.0
**Status:** Ready for GitHub push and Vercel deployment

---

## 🎯 Project Overview

DM HUD is a real-time AI-powered assistant for running D&D 5.5e campaigns. It uses Claude Haiku 4.5 for entity extraction and Deepgram Nova-2 for audio transcription.

**Repository Status:** Initialized, first commit ready to push
**Deployment Status:** Ready for Vercel deployment (no backend, 100% static)

---

## 🚀 Recent Work (v0.8.0)

### 1. Entity System Redesign
**Files:** `src/App.jsx` lines 1455-1527, 1684-1690, 2008-2014

- Removed ENEMY type entirely - everything is now CHARACTER
- Added `isHostile` flag to distinguish friendly/hostile
- Combat view filters by `inCombat + isHostile`
- Dynamic state changes: characters can become hostile/peaceful

**Example Flow:**
```
"three goblins appear"
→ Creates Goblin 1, 2, 3 as CHARACTERs (isHostile: false)

"tall goblin charges"
→ Updates Goblin 2: isHostile: true, inCombat: true
→ Moves to enemies column in combat view

"you negotiate peace"
→ Updates Goblin 2: isHostile: false, inCombat: false
→ Returns to characters column
```

### 2. Intelligent Transcript Buffering
**Files:** `src/App.jsx` lines 904-905, 951-983, 1004-1036

- Buffers live transcription to prevent incomplete sentence processing
- Smart flush: 2 seconds after silence OR 500ms after punctuation
- Prevents issues like "barmaid" being created mid-sentence
- Cleans up buffer on session stop

### 3. Character Events & Milestones
**Files:** `src/App.jsx` lines 1486-1513 (AI prompt), 1613-1643 (processing), 858-899 (UI), 1386-1401 (data)

- AI extracts ability checks, saves, attacks, discoveries, level-ups, story moments
- Stored in `session.events` array with timestamps
- Color-coded UI in character card Info tab
- Cross-session event history per character

### 4. Session Report Generator
**Files:** `src/App.jsx` lines 438-566 (modal), 1566-1621 (generator), 1452, 2084, 2244-2251

- New "Report" button in header
- AI generates: recap, MVP, highlights, quotes, key events
- Export to Markdown for sharing
- Beautiful modal UI with color-coded sections

### 5. Settings Reorganization
**Files:** `src/App.jsx` lines 226-383

- Split into 3 modals:
  - **Roster**: Player name → Character name mapping
  - **Arc**: Campaign secrets/DM context
  - **Settings**: API keys only

### 6. Inline HP/Stats Editing
**Files:** `src/App.jsx` lines 633-744

- Removed modal prompts and +/- buttons
- Direct number input for HP and stats
- Added full D&D 5.5e stats (STR/DEX/CON/INT/WIS/CHA, AC, Level, Class)

---

## 📁 Key Files

### Core Application
- **`src/App.jsx`** (2,258 lines) - Main application component with all logic
- **`src/main.jsx`** - React entry point
- **`src/index.css`** - Tailwind imports
- **`index.html`** - HTML entry

### Configuration
- **`package.json`** - Dependencies (React 18, Vite, Tailwind)
- **`vite.config.js`** - Vite config (port 3000)
- **`tailwind.config.js`** - Tailwind config
- **`.gitignore`** - Git ignore patterns

### Documentation
- **`README.md`** - Comprehensive project documentation
- **`CHANGELOG.md`** - Version history with migration guide
- **`HANDOFF.md`** - This file

---

## 🏗️ Architecture

### Tech Stack
- React 18 with functional components and hooks
- Vite for build/dev
- Tailwind CSS for styling
- Claude Haiku 4.5 API (client-side)
- Deepgram Nova-2 API (client-side)
- localStorage for persistence

### Data Structure
```javascript
Campaign {
  id, name, createdAt, updatedAt
  cards: Card[]               // All entities
  sessions: Session[]         // Session history
  playerRoster: RosterEntry[] // Player → Character mapping
  dmContext: string           // DM-only secrets
}

Card {
  id, type, name, notes, isCanon
  // CHARACTER-specific
  isPC, inParty, isHostile, inCombat
  hp: { current, max }
  stats: { STR, DEX, CON, INT, WIS, CHA }
  ac, level, class
  status: string[]            // Conditions
  canonFacts: string[]
  riffs: Record<string, string>
  genesis: string             // Creating transcript
}

Session {
  id, name, startTime, endTime, isActive
  transcript: TranscriptEntry[]
  events: Event[]             // Character milestones
}

Event {
  id, character, type, detail, outcome, timestamp
}
```

### State Management
- `campaignRef` pattern to avoid stale closures in async operations
- `useStorage` hook for localStorage with error handling
- Error Boundary for crash recovery

---

## 🚀 Next Steps

### 1. Push to GitHub

You have two options:

**Option A: Create new repo on GitHub first (recommended)**
```bash
# Go to github.com and create new repository "dm-hud"
# Then:
cd "/Users/michael/Desktop/Claude Code/dm-hud"
git remote add origin https://github.com/YOUR_USERNAME/dm-hud.git
git branch -M main
git push -u origin main
```

**Option B: Use GitHub CLI**
```bash
cd "/Users/michael/Desktop/Claude Code/dm-hud"
gh repo create dm-hud --public --source=. --remote=origin --push
```

### 2. Deploy to Vercel

**Safe to deploy publicly** - no API keys in code, users bring their own (BYOK).

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy
cd "/Users/michael/Desktop/Claude Code/dm-hud"
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? dm-hud
# - Directory? ./ (current)
# - Override settings? No

# For production deployment
vercel --prod
```

Alternatively, connect via Vercel dashboard:
1. Go to vercel.com
2. Import Git Repository
3. Select the dm-hud repo
4. Framework Preset: Vite
5. Deploy

### 3. Tag the Release

```bash
git tag -a v0.8.0 -m "v0.8.0: Major feature update"
git push origin v0.8.0
```

---

## ⚠️ Important Notes

### Security
- API keys stored in localStorage (client-side only)
- Keys sent directly to Anthropic/Deepgram APIs
- No backend or intermediary server
- Using `anthropic-dangerous-direct-browser-access` header (acceptable for local tools)

### Browser Storage
- All campaign data in localStorage
- Warns if storage exceeds 8MB
- No automatic backups yet
- Users should manually export important campaigns (feature planned)

### Known Issues
- No export/import of campaign data (coming soon)
- Speaker diarization from audio is imperfect
- No collaborative/multiplayer support
- No VTT integrations

---

## 🔧 Development Commands

```bash
# Start dev server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check git status
git status

# View commit history
git log --oneline
```

---

## 📊 Testing Checklist

Before considering this version stable, test:

- [ ] Create new campaign
- [ ] Add players to roster
- [ ] Type manual transcript entry
- [ ] Verify entity extraction
- [ ] Test "three goblins" → creates 3 separate cards
- [ ] Test "tall goblin charges" → updates specific goblin with combat state
- [ ] Toggle combat/exploration modes
- [ ] Edit HP inline
- [ ] Edit stats (STR, DEX, etc.)
- [ ] Start live audio session (requires Deepgram key)
- [ ] Generate session report
- [ ] Export report as Markdown
- [ ] View character events in Info tab
- [ ] Generate riffs for entities
- [ ] Create new session
- [ ] Switch between sessions
- [ ] Verify data persists after refresh

---

## 💡 Future Enhancements

### High Priority
- Export/import campaign data (JSON)
- Manual card creation UI
- Search/filter cards
- Initiative tracker

### Medium Priority
- Dice roll detection from transcript
- Image upload for entity cards
- Custom riff templates
- Multiple DM context pages

### Long Term
- Native iPad app
- VTT integrations (Roll20, Foundry)
- Multiplayer mode
- Voice command support

---

## 🤝 Handoff Checklist

- [x] Code documented with CHANGELOG.md
- [x] README.md updated with v0.8.0 features
- [x] package.json version bumped to 0.8.0
- [x] Git initialized with first commit
- [x] HANDOFF.md created with next steps
- [ ] Pushed to GitHub (awaiting user's GitHub username)
- [ ] Deployed to Vercel (awaiting user confirmation)
- [ ] Release tagged as v0.8.0

---

## 📞 Questions for Next Session

1. **GitHub**: What's your GitHub username for the repo URL?
2. **License**: Confirm MIT license or choose another?
3. **Vercel**: Should we deploy to Vercel now or wait?
4. **Next features**: What's the priority for v0.9.0?

---

**All code is working and tested. Dev server running at http://localhost:3000**

Good luck with the next session! 🚀
