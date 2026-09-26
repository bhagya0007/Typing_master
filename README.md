# TYPE//TANK — Ballistic Terminal Defense Arena

> An authentic dark retro DOS / arcade terminal typing defense combat simulator built entirely with **HTML5 Canvas, CSS, and Vanilla JavaScript**.
> Zero React, zero external libraries, zero npm dependencies, and zero external audio files.

---

## 🎮 Game Overview

In **TYPE//TANK**, you command an armored turret defending the perimeter against waves of descending hostile words. Every keystroke fires high-velocity ballistic plasma projectiles from an active 180° rotating cannon turret.

### Flow
`Operator Login (Callsign)` → `Arsenal & Screen Settings` → `Combat Directive Briefing` → `Turret Battlefield Arena` → `Sortie Debrief & Celebration` → `Flight Logs & Performance History`

---

## ⚡ Core Features

- **180° Semicircular Armored Turret**: Dynamic angular tracking, cannon recoil physics, muzzle flashes, and ballistic tracer rounds.
- **Automatic Lowest-First Priority**: If multiple visible words begin with the same character, the turret locks onto the lowest threat first (highest Y coordinate).
- **Faded Keystrokes & Cursor Glow**: Typed characters immediately fade to ~35–40% opacity while the active target letter glows with a retro cursor underline.
- **High-Threat Red Bonus Targets (3.5×)**: Glowing crimson targets that descend faster and grant 3.5× score multipliers, with conflict suppression and a 3-second cooldown window.
- **Perimeter Defense**: Hull integrity system with color-reactive damage states (Green >50%, Amber 25–50%, Critical Red <25%).
- **4 Distinct Arsenal Modes**:
  - `Mode 1 [Alpha]`: Lowercase only
  - `Mode 2 [Bravo]`: Lowercase + Uppercase
  - `Mode 3 [Charlie]`: Lowercase + Uppercase + Numbers (Coordinates & Math operations)
  - `Mode 4 [Delta]`: Full spectrum including brackets, special characters, and math expressions
- **Arcade Viewport & Aspect Ratio Architecture**:
  - `AUTO [SCREEN FIT]`: Fluid full-screen fit without letterboxing
  - `16:9 [WIDESCREEN]`: Widescreen arcade cabinet with side bezels
  - `4:3 [CLASSIC CRT]`: Vintage arcade pillarboxed monitor ratio
- **100% Native Web Audio API**: Procedural sound synthesis for lasers, explosions, red alert chimes, damage impacts, and victory fanfare.
- **Local Storage Engine**: Operator callsign persistence, attempt history logs with `★ PB` badges, and lifetime statistics.

---

## ⌨️ Controls & Accessibility

- <kbd>Real-Time Keys</kbd>: Fire ballistic cannon at falling threats
- <kbd>Enter</kbd> / <kbd>Space</kbd>: Advance screens, confirm selections, restart sortie
- <kbd>Esc</kbd>: Pause sortie / Abort to base
- <kbd>P</kbd>: Resume paused simulation
- <kbd>R</kbd>: Open Flight Logs (on Debrief screen)
- <kbd>S</kbd>: Open Arsenal Settings
- Header Buttons: Toggle CRT scanlines, toggle sound, cycle aspect ratio, switch operator callsign

---

## 🚀 Running Locally

No installation or build step needed. Simply open `index.html` in any modern web browser or serve via any static HTTP server:

```bash
# Using Python
python -m http.server 8080

# Or using Node
npx serve -l 8080 .
```

Open `http://localhost:8080` in your browser.
