# Changelog

All notable changes to the DM HUD project will be documented in this file.

## [0.8.0] - 2026-01-14

### Major Features

#### 🎭 Entity System Redesign
- **BREAKING:** Removed ENEMY entity type - everything is now CHARACTER
- Added `isHostile` flag to distinguish between friendly/hostile characters
- Added `inParty` flag to track party membership
- Combat view now filters by `inCombat + isHostile` instead of entity type
- Dynamic state changes: characters can become hostile/peaceful through gameplay
- Example: "three goblins" creates Goblin 1, 2, 3 as CHARACTERs; "tall goblin charges" makes that one hostile and enters combat

#### 🎤 Intelligent Transcript Buffering
- Live transcription now buffers incomplete sentences to prevent premature entity extraction
- Smart flush timing: 2 seconds after silence OR 500ms after sentence-ending punctuation
- Prevents issues like "the barmaid" creating incomplete entities mid-sentence
- Automatic buffer cleanup on session stop

#### 📊 Character Events & Milestones System
- AI automatically extracts and tracks character events from gameplay:
  - Ability checks (Persuasion, Investigation, etc.)
  - Saving throws (DEX, WIS, etc.)
  - Attack rolls (including natural 20s/1s)
  - Discoveries (secret doors, plot revelations)
  - Level ups
  - Story moments (deals with NPCs, major decisions)
- Color-coded event feed in character Info tab
- Outcome tracking (Success/Fail/Critical/Fumble)
- Events stored per-session with timestamps
- Cross-session event history per character

#### 📝 Session Report Generator
- New "Report" button in header
- AI-generated session summaries including:
  - **Session Recap**: Narrative summary of what happened
  - **🏆 MVP**: Most valuable player with reasoning
  - **✨ Highlights**: 3-5 memorable moments
  - **💬 Memorable Quotes**: Character dialogue with attribution
  - **📌 Key Events**: Significant character milestones
- Export reports to Markdown for sharing/archiving
- Beautiful modal UI with color-coded sections

### Improvements

#### Settings & Organization
- Split settings into three separate modals:
  - **Roster**: Player name → Character name mapping
  - **Arc**: Campaign secrets and DM context
  - **Settings**: API keys only (Anthropic, Deepgram)
- Cleaner header navigation

#### HP & Stats Management
- Made HP editing inline (removed modal prompts and +/- buttons)
- Direct number input for current/max HP
- Added full D&D 5.5e character stats:
  - Ability scores: STR, DEX, CON, INT, WIS, CHA with modifiers
  - AC, Level, Class fields
  - Inline editing for all stats

#### Error Handling
- Added React Error Boundary to prevent white screen crashes
- Improved localStorage error handling with size warnings
- Better recovery options when errors occur

### Technical Changes
- Updated AI prompt to extract events from transcript
- Added event processing pipeline (extraction → storage → display)
- Improved combat state management with hostility flags
- Enhanced card data structure with `isHostile`, `inParty`, `inCombat` flags
- Better transcript buffering with refs to prevent stale closures

### Bug Fixes
- Fixed roster preventing PC character creation on first mention
- Fixed thieves appearing in party column instead of enemies
- Fixed "six thieves" not creating 6 separate cards (now uses count field)
- Fixed "barmaid" → "Greta" creating duplicates (better clarification detection)
- Improved entity deduplication logic

## [0.7.0] - Previous Version

- Session management system
- Real-time audio transcription with Deepgram
- AI-powered entity extraction with Claude
- Combat/Exploration mode switching
- Riff generation system
- Card-based entity management

---

## Migration Guide: 0.7.x → 0.8.0

### Entity Type Changes
If you have existing campaigns with ENEMY entities:
- ENEMY types will be automatically treated as CHARACTERs
- You may need to manually set `isHostile: true` on existing enemies
- Combat view will now show all CHARACTERs with `inCombat: true`

### New Features Usage
1. **Events**: Just play normally - the AI will automatically extract events
2. **Reports**: Click "Report" button after a session to generate summary
3. **Stats**: Click on any stat field in character cards to edit inline

### API Compatibility
- No changes to Anthropic API usage
- No changes to Deepgram API usage
- All existing localStorage data remains compatible
