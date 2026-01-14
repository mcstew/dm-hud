# DM HUD - Dungeon Master Heads-Up Display

**Version:** 0.8.0
**Last Updated:** January 14, 2026
**Status:** Active Development

![Version](https://img.shields.io/badge/version-0.8.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Overview

A real-time AI-powered assistant for running D&D 5.5e campaigns. Automatically tracks characters, locations, items, plot threads, character milestones, and generates rich session reports using Claude AI and Deepgram transcription.

### The Problem

Running a D&D session requires DMs to simultaneously:
- Track multiple NPCs, their names, voices, and motivations
- Remember locations and their details
- Manage combat (HP, conditions, initiative)
- Improvise responses to unexpected player actions
- Maintain narrative consistency across sessions

Most DMs rely on scattered notes, memory, and quick thinking. Important details get lost. Named NPCs get forgotten. Improvised content contradicts earlier canon.

### The Solution

DM HUD acts as an always-listening "second brain" that:
1. **Automatically indexes** everything said at the table
2. **Creates entity cards** for characters, locations, items as they're mentioned
3. **Tracks state** (HP, conditions, hostility) in real-time with dynamic updates
4. **Records character milestones** (rolls, checks, discoveries) automatically
5. **Generates AI suggestions** for details the DM hasn't established yet
6. **Creates session reports** with recaps, MVP awards, highlights, and memorable quotes

---

## ✨ Features

### 🎭 Smart Entity Management
- **Everything is a Character**: Unified system - party members, NPCs, monsters all managed consistently
- **Dynamic Hostility**: Characters shift from friendly → hostile → peaceful through gameplay
- **Combat State Tracking**: Automatic combat mode with party/enemies split by hostility
- **Drag & Drop Reordering**: Organize your entities visually

### 🎤 Live Audio Transcription
- Real-time speech-to-text using Deepgram Nova-2
- Intelligent buffering prevents incomplete extractions
- Speaker diarization (DM vs Players)
- File upload support for pre-recorded sessions

### 🤖 AI-Powered Tracking
- **Automatic Entity Extraction**: Claude Haiku 4.5 identifies characters, locations, items, and plot threads
- **HP & Status Management**: Detects damage, healing, and condition changes from natural speech
- **D&D 5.5e Stats**: Captures ability scores, AC, level, class when mentioned
- **Smart Deduplication**: "the barmaid introduces herself as Greta" updates existing entity

### 📊 Character Events & Milestones
- Automatic tracking of:
  - Ability checks (Persuasion, Investigation, etc.)
  - Saving throws with outcomes
  - Attack rolls (including crits and fumbles)
  - Discoveries and revelations
  - Level ups and story moments
- Color-coded event feed per character
- Cross-session event history

### 📝 Session Reports
- AI-generated session summaries with:
  - Narrative recap
  - Session MVP with reasoning
  - Memorable highlights
  - Character quotes
  - Key events timeline
- Export to Markdown for sharing

### 🎲 Campaign Management
- **Multi-Session Support**: Track multiple sessions per campaign
- **Player Roster**: Map real names to character names
- **Campaign Arc**: Store DM-only secrets that inform AI suggestions
- **Session Archives**: Review previous sessions and transcripts

### ✨ Riff Generation
- Generate creative atmospheric details on-demand
- Canonize riffs to make them permanent
- Character details, location atmosphere, enemy tactics, and more

---

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Anthropic API key (for AI features)
- Deepgram API key (for audio transcription)

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will open in your browser at http://localhost:3000

### Configuration

1. Click **Settings** (top right)
2. Go to **API Keys** tab
3. Enter your Anthropic API key (`sk-ant-...`)
4. Enter your Deepgram API key
5. Click **Save**

Keys are stored locally in your browser and never sent to any server besides the respective APIs.

---

## Core Concepts

### Canon vs. Riff

This is the central design philosophy:

- **Canon** = Information that has been spoken/written into existence by the DM or established through play. Solid borders, emerald accents. This is truth.

- **Riff** = AI-generated suggestions that haven't been used yet. Dashed borders, amber accents. These are proposals the DM can accept, modify, or ignore.

The DM always has final authority. One click "canonizes" a Riff, moving it from suggestion to established fact.

### Entity Cards

Everything tracked is an **Entity Card** with a type:

| Type | Icon | Use Case |
|------|------|----------|
| CHARACTER | 👤 | PCs, NPCs, named individuals |
| LOCATION | 📍 | Places, rooms, regions |
| ITEM | ⚔️ | Weapons, artifacts, objects |
| ENEMY | 💀 | Hostile creatures (with HP) |
| PLOT | 📜 | Story threads, quests, mysteries |

Cards can be:
- **Canon** (established in play) or **Riff** (AI-generated, unconfirmed)
- **PC** (Player Character - protected from deletion)
- Have **HP** (hit points with visual bar)
- Have **Conditions** (D&D 5.5e status effects)
- Have **Riffs** (AI-generated detail suggestions)

### Riff Templates

Each entity type has predefined suggestion slots:

**Characters:**
- Full Name, Appearance, Voice/Accent, Personality, Secret

**Locations:**
- Atmosphere, Sounds, Notable Feature

**Enemies:**
- Distinguishing Feature, Tactics, Weakness

**Items:**
- Origin, Hidden Property

**Plot:**
- Potential Twist, Connection

These aren't random—they're the "table stakes" details a DM might need to improvise when a player asks "What does she look like?" or "Is there anything unusual about this sword?"

---

## Features

### Multi-Campaign Support
- Home screen shows all campaigns in a grid (Sudowrite-style)
- Click into a campaign to view/edit
- Each campaign has its own cards, transcript, and DM context
- Campaigns persist via browser storage

### Dashboard Modes

**Exploration Mode (4 columns)**
- Characters | Locations | Items | Plot
- Optimized for roleplay, investigation, travel

**Combat Mode (2 columns)**
- Party | Enemies
- Quick HP adjustment buttons (+/- on each card)
- Condition tracking
- Auto-switches when combat detected in transcript

### AI Processing Pipeline

1. **Input** arrives (typed or transcribed audio)
2. **Claude Haiku** analyzes the text and returns:
   - Parsed transcript entries (speaker + text)
   - New entity cards to create
   - Updates to existing cards (renames, new info)
   - Mode switch triggers (combat/exploration)
   - Status/HP changes detected
3. **Dashboard updates** in real-time
4. **Auto-riffs** generate for new cards (top 3 suggestions)

### Audio Transcription

- Upload audio file → Deepgram Nova-2 transcribes
- Speaker diarization attempts to identify DM vs. Players
- Chunks processed sequentially with progress indicator
- Requires user's own Deepgram API key (BYOK)

### DM Secret Context

A private text field where DMs can store:
- Campaign secrets ("The merchant is actually a spy")
- Plot twists not yet revealed
- NPC true motivations

The AI references this when generating Riffs, so suggestions align with the DM's plans without spoiling anything.

---

## Usage

### Quick Start

1. Open http://localhost:3000
2. Click **Settings** (top right)
3. Go to **API Keys** tab
4. Enter your Anthropic API key (`sk-ant-...`)
5. Enter your Deepgram API key
6. Click **Save**
7. Click **New Campaign**
8. Name your campaign
9. Start typing in the input field: `DM: You enter the tavern and see Greta the innkeeper.`
10. Watch cards auto-generate!

### Testing with Audio

1. Configure Deepgram API key in Settings
2. Click **Upload Audio** in the Audio Transcription panel
3. Select an audio file (MP3, WAV, etc.)
4. Click **Transcribe**
5. Watch transcript populate and cards generate

### Manual Workflow

Even without API keys, you can:
- Type transcript entries manually
- Cards won't auto-generate, but transcript is preserved
- Add cards manually (future feature)

---

## Technical Stack

- **Frontend:** React 18 with Vite
- **Styling:** Tailwind CSS
- **AI Processing:** Claude Haiku (claude-haiku-4-5-20250929)
- **Transcription:** Deepgram Nova-2
- **Storage:** Browser localStorage
- **Deployment:** Local development (web app), future iPad app planned

---

## Project Structure

```
dm-hud/
├── index.html           # HTML entry point
├── src/
│   ├── App.jsx         # Main application component
│   ├── main.jsx        # React entry point
│   └── index.css       # Tailwind imports
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
└── README.md           # This file
```

---

## Current Status

### Working
- ✅ Multi-campaign management (create, delete, switch)
- ✅ Entity card CRUD (create, read, update, delete)
- ✅ HP and condition tracking
- ✅ Exploration/Combat mode switching
- ✅ AI transcript processing (entity extraction)
- ✅ AI Riff generation
- ✅ Canon/Riff visual distinction
- ✅ Detail drawer with tabbed interface
- ✅ Settings modal with BYOK configuration
- ✅ Deepgram audio transcription (prerecorded files)
- ✅ Persistent storage (survives refresh)
- ✅ Custom SVG icons (no emoji dependencies)

### Known Limitations
- No live/streaming audio transcription yet (file upload only)
- No export/import of campaign data
- No undo/redo
- No collaborative/multiplayer support
- No integration with VTTs (Roll20, Foundry, etc.)
- AI occasionally misses entities or creates duplicates
- Speaker diarization is imperfect

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Roadmap

### Near Term
- [ ] Live audio transcription (WebSocket to Deepgram)
- [ ] Session recording (start/stop session, save transcript)
- [ ] Manual card creation (not just AI-detected)
- [ ] Search/filter cards
- [ ] Export campaign to JSON

### Medium Term
- [ ] Initiative tracker integration
- [ ] Dice roll detection from transcript
- [ ] Image upload for entity cards
- [ ] Custom Riff templates
- [ ] Multiple DM context "pages" (NPCs, Locations, Secrets)

### Long Term
- [ ] Native iPad app (Swift)
- [ ] VTT integrations
- [ ] Multiplayer (players see public card info)
- [ ] Voice command support
- [ ] Campaign "replay" from transcript

---

## 📝 Recent Changes (v0.8.0)

### New in 0.8.0
- 🎭 **Entity System Redesign**: Everything is CHARACTER with hostility flags (removed ENEMY type)
- 🎤 **Intelligent Transcript Buffering**: Prevents incomplete sentence extractions
- 📊 **Character Events & Milestones**: Automatic tracking of rolls, checks, discoveries
- 📝 **Session Report Generator**: AI-powered summaries with Markdown export
- ⚙️ **Settings Reorganization**: Split into Roster, Arc, and Settings modals
- 💚 **Inline HP/Stats Editing**: Direct number input, removed modal prompts
- 🛡️ **Error Boundary**: Better crash recovery

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🙏 Acknowledgments

- Built with [Claude](https://claude.ai) AI assistance
- Powered by [Anthropic](https://anthropic.com) and [Deepgram](https://deepgram.com)
- Inspired by the D&D community's need for better DM tools

**Happy DMing! May your rolls be high and your players engaged.** 🎲✨
