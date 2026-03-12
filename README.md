# NetHack HUD — Intelligent Game Assistant

A web-based NetHack client with real-time game state parsing and contextual assistance panels, connecting to [Hardfought](https://hardfought.org) servers via SSH.

![Dark themed HUD with terminal and side panels]

## Features

- **xterm.js Terminal** — Full terminal emulation with low-latency input
- **Price ID Engine** — Auto-identifies items from shop prices using NetHack 3.7 base price tables
- **Risk Assessment** — Real-time danger score (1-10) based on HP, AC, monsters, status effects
- **Monster Threats** — Identifies visible monsters with danger ratings and counter strategies
- **Ascension Kit Tracker** — Track equipment slots and intrinsic resistances
- **Message Log** — Searchable history of game messages
- **Branch Detection** — Auto-detects dungeon branch from Dlvl format
- **Visual Risk Indicator** — Terminal border color changes based on danger level

## Setup

```bash
cd nethack-hud
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For development with auto-reload:
```bash
npm run dev
```

## Architecture

```
Browser (xterm.js) ↔ WebSocket ↔ Node.js Server ↔ SSH (hardfought.org)
                                                    ↕
                                          Terminal Buffer Parser
                                                    ↕
                                    Game State → UI Panels
```

## Layout

- **Left sidebar**: Ascension Kit tracker, Price ID tool
- **Center**: xterm.js terminal (auto-sized)
- **Right sidebar**: Risk Meter, Monster Threats, Message Log
- **Top bar**: Connection status, dungeon level, turn count

## Keyboard Shortcuts

- `Alt+1` — Toggle left panel
- `Alt+2` — Toggle right panel

## Technical Notes

- Terminal input is forwarded with zero processing delay
- Game state parsing uses `requestIdleCallback` to avoid blocking the main thread
- Parser reads xterm.js buffer rows directly for accurate state extraction
- Price ID accounts for Charisma modifiers on buy/sell prices

## Requirements

- Node.js 18+
- npm
