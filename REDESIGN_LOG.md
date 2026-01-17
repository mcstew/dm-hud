# DM HUD Redesign Log

This document tracks design decisions and changes made during the visual redesign.

## Design Philosophy
- "Tactical Dark Mode" - deep gray tones with high-contrast utility
- Glassmorphism with backdrop-blur for floating elements (header, HUD, modals)
- Preserve ALL existing functionality

## Target Device
- Desktop browser primary
- Landscape iPad (native or web) as final destination
- No mobile phone optimization needed

## Completed Changes Summary

### Color Palette Migration
| Role | Old | New |
|------|-----|-----|
| Background Base | slate-950 | gray-950 (#030712) |
| Surface Primary | slate-900 | gray-900 (#111827) |
| Surface Glass | N/A | gray-900/90 + backdrop-blur |
| Border Subtle | slate-700/800 | gray-800 (#1f2937) |
| Border Active | slate-600 | gray-700 (#374151) |
| Accent Primary | violet-600 | indigo-600 (#4f46e5) |
| Accent Combat | red-600 | red-600 (#dc2626) |
| Accent Health | emerald-500 | emerald-500 (#10b981) |
| Accent Loot | amber-400 | amber-400 (#fbbf24) |
| Locations | cyan-400 | emerald-400 (consolidated) |

### Icon System
- Replaced all custom SVG icons with Tabler Icons (@tabler/icons-react)
- Centralized icon mapping in `Icons` object for easy maintenance
- Icons used: IconUsers, IconSwords, IconUser, IconMapPin, IconBackpack, IconBook, IconCompass, IconSword, IconSettings, IconMicrophone, IconMessageCircle, IconTrash, IconCheck, IconX, IconPlayerPlay, IconPlayerStop, IconCircleFilled, IconChevronLeft, IconPlus, IconKey, IconDice5, IconWorld, IconCalendar, IconChevronDown, IconHeart, IconShield, IconActivity, IconAlertTriangle, IconFileText, IconSend, IconUserPlus

### Glassmorphism Elements
- Header: `bg-gray-950/80 backdrop-blur-md` with sticky positioning
- HUD/Chat panel: `bg-gray-900/90 backdrop-blur-md rounded-2xl`
- Modals: `bg-black/60 backdrop-blur-sm` backdrop

### Component Updates

#### Header (CampaignView)
- Fixed height: h-16
- Sticky positioning with z-30
- Glass effect with backdrop-blur
- Updated mode toggle styling

#### Entity Cards (CompactCard)
- New hover states: `hover:bg-gray-800 hover:border-gray-700`
- Updated color classes for card types
- Canon cards: solid border, gray-900/50 bg
- Riff cards: dashed amber border, gray-900/30 bg

#### Detail Drawer
- Glass backdrop with blur
- Improved input focus states with indigo highlight
- Consistent gray color palette throughout

#### HUD/Chat Area
- Floating design with gradient fade to transparent
- Rounded-2xl containers
- Input field with glass effect
- Improved transcript styling with emerald player color

#### Modals
- All modals now have backdrop-blur-sm
- Consistent gray-900 background
- Updated border colors

### Custom Scrollbars
Added in index.css:
```css
scrollbar-width: thin;
scrollbar-color: #374151 #111827;
```
With webkit fallbacks for 8px thin scrollbars.

### Card Type Colors
| Type | Color |
|------|-------|
| CHARACTER | indigo |
| LOCATION | emerald |
| ITEM | amber |
| PLOT | pink |
| ENEMY | red |

## New Features Added

### Session-Based Card Filtering
- Cards now track which session created them via `sessionId` field
- When viewing an earlier session, cards created in later sessions are hidden
- Preserves "time travel" view into previous sessions' state
- Legacy cards (without sessionId) are always visible

### The Void (Graveyard System)
- Deleted cards are moved to "The Void" instead of permanent deletion
- Void button in bottom-left corner with card count badge
- Cards in Void show:
  - Card name and type
  - Which session they were voided in
  - Notes preview
- Actions available:
  - **Restore**: Returns card to active cards
  - **Permanently Delete**: Removes card forever
  - **Empty The Void**: Clears all voided cards (with confirmation)
- Purple accent color scheme for Void UI

### Transcript Export (Upgraded)
- **Smart Merging**: Client-side merge combines same-speaker entries within 5-second threshold
- **AI Polish**: Claude Haiku pass fixes transcription errors, punctuation, and formatting
- **Dual Scope**: Both session-level and campaign-level exports available
- Downloads as polished markdown file
- Filename format: `CampaignName_SessionName_transcript.md` or `CampaignName_full_transcript.md`

### Unified Tools Panel
Consolidated settings, reports, and exports into single `ToolsPanel` component with three tabs:

**Account Tab**
- API key management (Anthropic, Deepgram)
- Status indicators for configured keys
- Preferences placeholder (coming soon)

**Campaign Tab** (only shown when viewing a campaign)
- Campaign info header with avatar and stats
- Campaign Artifacts section:
  - Full campaign transcript export (all sessions combined)
  - Campaign-level report generation

**Session Tab** (only shown when viewing a campaign)
- Current session info header
- Session Artifacts section:
  - Session transcript export
  - Session report generation (highlights, MVP, quotes, events)

**Header Restructure**
- Replaced: [Roster] [Arc] [Report] [Settings]
- New: [Roster] [Arc] [Tools]
- Cleaner navigation, all tools in one place

### Additional Icons Added
- IconGhost2 - Void/graveyard indicator
- IconRefresh - Restore card action
- IconDownload - Export transcript

### Combat State Detection (AI Prompt Improvements)
Improved AI prompt for better hostile/combat flag detection:
- **Ambush recognition**: "ambushed by goblins" now correctly sets `isHostile: true` and `inCombat: true`
- **Clearer examples**: Updated JSON examples to show hostile creatures with proper flags
- **Combat triggers**: Added explicit rules - ambushing creatures are ALWAYS hostile and in combat
- **Mode switching**: Ambush scenarios now properly trigger `modeSwitch: "combat"`

### Context-Aware Modal Headers
- ToolsPanel shows "Settings" header when accessed from home page (no campaign context)
- ToolsPanel shows "Tools" header when accessed from within a campaign
- Fixed text color for readability (`text-white`)

---

## Version History

### v0.9.0 (Current)
- Unified Tools Panel with Account/Campaign/Session tabs
- Smart transcript export with AI polishing
- Combat state detection improvements
- Context-aware Settings/Tools header

### v0.8.1
- Initial design refresh with Tabler Icons
- Session-based card filtering
- The Void (graveyard system)
- Basic transcript export

---

## Build Status
✅ Build successful
- CSS: ~27 KB (5.5 KB gzipped)
- JS: ~246 KB (72 KB gzipped)

## Dependencies
- @tabler/icons-react - MIT licensed icon library (https://tabler.io/icons)
- react, react-dom - UI framework
- vite, tailwindcss - Build tooling

## Files Modified
- src/App.jsx - Main application component
- src/index.css - Custom scrollbar styles
- package.json - Dependencies and version
