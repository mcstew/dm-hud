# DM HUD: Design & Implementation Guide

This document outlines the design specifications, assets, and implementation strategies required to replicate the "DM HUD" aesthetic. It is intended for engineers and designers looking to apply this specific look and feel to a functional RPG session management application.

## 1. Design Philosophy & Aesthetic
The design language is **"Tactical Dark Mode"**. It balances immersion (limiting light output during tabletop play) with high-contrast utility (critical stats must be readable at a glance).

*   **Base Theme**: Deep dark grays (Slate/Zinc 950) rather than pure black, providing depth without harshness.
*   **Materiality**: Glassmorphism (`backdrop-blur`) is used for floating elements (HUD, Headers) to maintain context of what's behind them.
*   **Hierarchy**: Primary actions use high-saturation accent colors (Indigo for general, Red for combat, Emerald for health). Secondary information is muted (Gray 400/500).

## 2. Color Palette (Tailwind CSS)

Configure your tailwind.config.js to include these specific shades if not present in the default palette.

| Role | Tailwind Class | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Background Base** | `bg-gray-950` | `#030712` | Main app background. |
| **Surface Primary** | `bg-gray-900` | `#111827` | Cards, Panels, Sidebars. |
| **Surface Glass** | `bg-gray-900/90` | N/A | Floating HUDs, Headers (requires `backdrop-blur-md`). |
| **Border Subtle** | `border-gray-800` | `#1f2937` | Dividers, Card borders. |
| **Border Active** | `border-gray-700` | `#374151` | Hover states, Inputs. |
| **Accent Primary** | `indigo-600` | `#4f46e5` | Primary buttons, Active tabs, PC highlights. |
| **Accent Combat** | `red-600` | `#dc2626` | Combat mode, Enemy highlights, Threats. |
| **Accent Health** | `emerald-500` | `#10b981` | HP Bars, "Healthy" status, Locations. |
| **Accent Loot** | `amber-400` | `#fbbf24` | Items, Inventory. |

## 3. Iconography (Tabler Icons)

We utilize **Tabler Icons** (https://tabler.io/icons) for their consistent stroke width (2px) and modern geometry. 

**Implementation Rule**: Wrap all SVGs in a standard container (e.g., 24x24) to ensure alignment. Use `stroke="currentColor"` and `fill="none"`.

### Core Navigation & UI
*   `chevron-left` : Back navigation.
*   `chevron-down` : Dropdown triggers.
*   `settings` : Configuration menus.
*   `plus` : "Add New" actions.
*   `x` : Close modals/panels.
*   `menu-2` (optional): Mobile menu trigger.
*   `search` (optional): Filter lists.

### Domain Specific
| Icon Name | Tabler Equivalent | Context / Usage |
| :--- | :--- | :--- |
| **Exploration** | `compass` | Toggle Exploration Mode. |
| **Combat** | `sword` | Toggle Combat Mode. |
| **Enemies** | `swords` | Enemy lists in combat view. |
| **Characters** | `users` | PC lists, Roster. |
| **Locations** | `map-pin` | Location entities. |
| **Inventory** | `backpack` | Items, Loot, Shops. |
| **Lore/Plot** | `book` | Plot threads, Quest logs. |
| **Campaigns** | `world` | Campaign selection, empty states. |
| **Sessions** | `calendar` | Session selector/history. |

### Actions & Stats
*   `microphone`: Voice input toggle.
*   `send`: Submit chat/command.
*   `heart`: Hit Points (HP).
*   `shield`: Armor Class (AC).
*   `activity`: Initiative or Status effects.
*   `alert-triangle`: Warnings (API keys missing).
*   `check`: "Canon" fact verification.

## 4. Component Implementation Specifications

### A. The "Glass" Header
*   **Structure**: Fixed height (`h-16`), sticky or fixed positioning.
*   **Style**: `bg-gray-950/80` + `backdrop-blur-md` + `border-b border-gray-800`.
*   **Content**: 
    *   Left: Back button + Campaign Title.
    *   Center (Desktop): Session Selector (Dropdown).
    *   Right: Mode Toggles (Exploration/Combat) + Global Actions (Roster/Settings).

### B. Entity Cards (List Items)
Instead of a simple list, entities are presented in cards within category columns.
*   **Container**: `bg-gray-900/50` (transparent) -> `hover:bg-gray-800` (interactive).
*   **Border**: `border border-transparent` -> `hover:border-gray-700`.
*   **Image Handling**: 
    *   Square aspect ratio container (`w-10 h-10`).
    *   If no image: Fallback to Gray-800 background with a bold character initial.
    *   Status Overlays: "Dead" status should overlay a semi-transparent black layer with a red cross or skull icon.
*   **Typography**: Name is `text-gray-200 font-medium`; metadata is `text-gray-500 text-xs`.

### C. The Detail Panel (Slide-Over)
Do not use centered modals for entity details; they break the flow. Use a slide-over panel from the right.
*   **Animation**: `transform transition-transform duration-300`. Slide from `translate-x-full` to `translate-x-0`.
*   **Header**:
    *   Use the entity image as a background with a gradient overlay (`bg-gradient-to-t from-gray-900`).
    *   Position Title and Tags at the bottom of the header image area.
*   **Stats Grid**: Use a CSS Grid (`grid-cols-6`) for Attributes (STR, DEX, etc.) to mimic a character sheet layout.

### D. The HUD (Bottom Command Center)
The chat and input area should feel detached from the layout, floating above the content.
*   **Position**: Fixed bottom (`bottom-0 left-0 right-0`).
*   **Background**: `bg-gradient-to-t from-gray-950 via-gray-950 to-transparent`. This ensures the content behind it fades out smoothly.
*   **Container**: Max-width (`max-w-4xl`), centered, rounded corners (`rounded-2xl`).
*   **Chat Styling**:
    *   DM Messages: Align Right, Accent Color Background (`bg-indigo-600/20`).
    *   AI/System Messages: Align Left, Dark Background (`bg-gray-800`).
    *   Input: Transparent background, no border, large touch target for microphone.

## 5. View Logic & State Management

### Session Management
*   The UI must allow switching "Active" sessions.
*   Visual Indicator: Use a pulsing green dot (`w-2 h-2 rounded-full bg-green-500 animate-pulse`) next to the session name if it is currently recording/live.

### Combat Mode Transformation
*   **Trigger**: Toggle button in Header.
*   **Layout Change**: 
    *   *Exploration Mode*: 4 Columns (Characters, Locations, Items, Plot).
    *   *Combat Mode*: 2 Columns (Party, Enemies).
*   **Filtering**: Entities tagged as 'enemy' move to the Enemies column. PCs move to Party. Non-combat entities (Locations, Plots) are hidden to reduce cognitive load.

## 6. Optimization Notes for Engineers
1.  **Scrollbars**: Hide default scrollbars. Use a custom thin scrollbar (`width: 8px`, `bg-gray-900`, thumb `bg-gray-700 rounded`) to maintain immersion.
2.  **Mobile Responsiveness**: 
    *   On mobile, the 4-column grid must collapse to 1 column.
    *   The Detail Panel should take up 100% width on mobile (`w-full` instead of `w-96`).
3.  **Performance**:
    *   The entity list can grow large. Ensure the container has `overflow-y-auto` and a defined max-height (e.g., `max-h-[calc(100vh-250px)]`) to prevent page scrolling.
    *   Lazy load entity images if possible.

## 7. Example Entity Data Structure for UI
To fully support the UI, ensure your backend/state objects support these fields:
```typescript
{
  type: 'pc' | 'npc' | 'enemy' | 'location' | 'item';
  status: 'Healthy' | 'Bloodied' | 'Unconscious' | 'Dead';
  stats: {
    hp: number;
    maxHp: number;
    ac: number;
    // ... attributes
  };
  image: string; // URL
  tags: string[]; // e.g., ["Healer", "Flying"]
}
```
