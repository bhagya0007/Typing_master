Build a polished browser game called **TYPE//TANK** using only **HTML, CSS, and vanilla JavaScript**. No React, backend, database, npm packages, external libraries, or external APIs. All sound effects must be synthesized natively using the Web Audio API, and all graphics rendered using HTML5 Canvas and CSS.

---

### Flow & Navigation
**Login (Callsign)** → **Settings (Arsenal & Screen Aspect)** → **Instructions (Combat Briefing)** → **Game (Turret Battlefield)** → **Result (Sortie Debrief)** → **My Records (Flight Logs)**

Provide full keyboard accessibility throughout:
- Enter/Space to advance screens and confirm
- Real-time keystrokes during gameplay
- Esc to abort combat sortie
- 'R' on Result screen to open My Records
- Header buttons for CRT scanline toggle, Audio mute toggle, Aspect Ratio toggle, and Callsign switch

---

### Visual Style & Retro Aesthetic
Use an authentic **dark retro DOS / arcade terminal aesthetic** throughout the entire application:
- Deep black/dark-green background (`#020402` to `#060a06`)
- Authentic retro arcade fonts (e.g. `'Press Start 2P'`, `'VT323'`, and `'Share Tech Mono'`)
- CRT-style glow, phosphor bloom, and subtle scanline overlay with a CRT ON/OFF toggle
- Green and white interface text with crimson-red bonus highlights and amber warnings
- Angular DOS-style bracketed containers, ASCII headers (`+---[ TITLE ]---+`), and glowing reticles
- No generic modern SaaS cards, rounded gradient pills, or corporate web forms

---

### Screen Aspect Ratio & Viewport Fit Architecture (Crucial Requirement)
The game must look and function like a real arcade cabinet that dynamically adapts to the user's screen and browser window without cut-offs or overflow:

1. **Aspect Ratio Modes (Switchable in Header & Settings)**:
   - **`AUTO [SCREEN FIT]` (Default)**: Fluidly scales to fill the current browser window and screen resolution without letterboxing.
   - **`16:9 [WIDESCREEN]`**: Centers the arcade cabinet with an authentic 16:9 widescreen ratio, side bezels, and deep cathode shadows.
   - **`4:3 [CLASSIC CRT]`**: Centers the cabinet in a classic 4:3 retro arcade monitor ratio with vintage arcade side pillarboxing.
   - Mode selection must be saved to `localStorage` and persist across sessions.
   - Resizing or toggling aspect ratio must trigger dynamic canvas and physics coordinate recalibration.

2. **100% Zoom Viewport Fit (No Zoom-Out Needed)**:
   - Every single screen (Login, Settings, Instructions, Game Arena, Debrief, My Records) must fit completely on standard laptop and desktop viewports (e.g. 1366×768, 1920×1080, and 1024×600) at **100% zoom without vertical scroll clipping**.
   - Use compact multi-column layouts (e.g. 2-column or 4-column grids), compact chips, and fluid `clamp(...)` sizing.
   - Avoid flex centering scroll-traps: ensure scrollable screen wrappers use `justify-content: flex-start` with `margin: auto` on boxes so that on smaller screens content can still be scrolled without top-edge clipping.

---

### 1. Login (Operator Authentication)
- Prompt for an operator callsign / username with a DOS command line: `CALLSIGN> [_________]`.
- Store the username in `localStorage` and display it in the header HUD throughout the entire session.
- Include a "SWITCH CALLSIGN" option in the marquee header to change users anytime.

---

### 2. Settings (Arsenal & Display Configuration)
Lowercase is always enabled and permanently armed. Allow exactly these **4 distinct modes**:
1. **Mode 1 [Alpha]**: Lowercase (`tank`, `radar`, `artillery`)
2. **Mode 2 [Bravo]**: Lowercase + Uppercase (`Tank`, `RadarX`, `DeltaForce`)
3. **Mode 3 [Charlie]**: Lowercase + Uppercase + Numbers (`Squad5`, `Tank99`, `(8+9)`, `v2.0`)
4. **Mode 4 [Delta]**: Lowercase + Uppercase + Numbers + Special Characters (`[tank-01]`, `(8+9)`, `{cmd-9}`, `!alert!`, hyphens, brackets, math operators)

Features:
- 4 interactive mode cards with live preview samples.
- Granular character matrix toggles (Uppercase, Numbers, Specials) synced bi-directionally with the 4 modes.
- Aspect ratio selection buttons (`AUTO`, `16:9`, `4:3`).
- Dynamic preview bar displaying sample words for the selected arsenal mode.

---

### 3. Instructions (Tactical Briefing)
Present a concise, high-density **2-column tactical directive grid** that fits entirely on the screen without scrolling:
- **Hostile Words Fall from Top**: Neutralize threats before they breach the defense perimeter.
- **Turret Targeting & Lock-On**: Type characters to fire. If multiple visible words begin with the same character, the tank **automatically targets the lowest/bottom-most word first**. Once locked, subsequent characters continue targeting that word until destroyed.
- **Ballistic Fire & Fade Effect**: Every correct keystroke fires a visible bullet from the 180° cannon. Typed characters immediately **fade to ~35–40% opacity** while remaining letters stay crisp.
- **Red Bonus Targets**: Descend faster, styled in glowing crimson, and grant **3.5× score multipliers**. While a red word is active/falling, conflicting words starting with the same character are temporarily suppressed, followed by a cooldown exclusion window after resolution.
- **Perimeter Defense & Hull Integrity**: Missed words that hit the bottom defense line detonate and damage tank health. Sortie terminates when tank integrity reaches 0%.
- Ready prompt with keyboard trigger (`PRESS SPACEBAR OR ENTER TO ENGAGE`).

---

### 4. Game (Real-Time Ballistic Defense Arena)
Create an authentic real-time Canvas 2D typing defense combat simulation:

- **Semicircular Tank & 180° Rotating Turret**:
  - Anchored at bottom-center of the canvas.
  - Semicircular dome turret with armor plates, tread chassis base, and an active cannon barrel.
  - The cannon smoothly rotates across a **180° arc** (-180° to 0°) pointing directly at the active targeted word.
  - Recoil pushback animation and muzzle flash particle burst on every shot fired.

- **Ballistic Bullet Physics & Keystrokes**:
  - Every correct keystroke immediately shoots a visible projectile bullet towards that specific character in the word.
  - Tracer lines, impact sparks, and synthesized laser SFX accompany every shot.
  - Typed characters immediately drop to **~35–40% opacity** with an active glowing cursor under the current letter.

- **Target Lock & Lowest-First Priority**:
  - When the user presses a character, inspect all currently falling words starting with that character.
  - If multiple words match, **automatically lock onto the lowest / bottom-most word (highest Y coordinate)**.
  - Once locked, the tank stays locked onto this word for subsequent letters until the entire word is completed and destroyed or it hits bottom.

- **Red Bonus Targets & Spawning Rules**:
  - Periodically spawn high-threat red bonus targets that fall significantly faster and give 3.5× score.
  - While a red bonus word is falling, **temporarily prevent any new word with the same starting character from spawning**.
  - Enforce a short exclusion cooldown window (~3 seconds) after the red word is destroyed or missed before that initial character can spawn again.

- **Perimeter Breach & Hull Damage**:
  - Words reaching the bottom perimeter detonate with screen shake, alarm SFX, and hull damage (20% normal, 30% bonus).
  - Tank health bar with color-reactive states (green > 50%, amber 25–50%, critical red < 25%).
  - Destruction of tank triggers death particle explosions and transitions to debriefing.

- **Progressive Difficulty & Real-Time Stats HUD**:
  - Fall speed and spawn rate scale up progressively with elapsed time and completed words.
  - Compact single-row top HUD bar displaying Operator, Mode, 6-digit zero-padded Score, Combo multiplier, live WPM, Accuracy %, and Tank Integrity bar.

---

### 5. Result (Sortie Debrief & Record Celebration)
- Metrics grid: Final Score, Average WPM, Accuracy %, Words Destroyed, Max Combo, Mode Played.
- Compare result against the user's personal best for that specific mode from `localStorage`.
- **Arcade Record Celebration**:
  - If a **New Personal Best** is achieved: Trigger a flashing arcade celebration banner (**“★ NEW RECORD! ★”**), play a victory fanfare sound, and launch a full-screen multi-color confetti particle celebration.
  - If not a new record: Show previous personal best and the exact score/WPM delta needed to surpass it.
- Keyboard shortcuts: `[ENTER / SPACE]` to play again, `[R]` to inspect My Records.

---

### 6. My Records / Performance History (Local Storage)
Do NOT call this a global leaderboard. Create an operator **Performance History & Flight Log** screen using `localStorage`:
- Lifetime Operator Overview: Personal Best Score, Maximum WPM, Peak Accuracy, Total Words Destroyed.
- Mode Bests Quad: 4 dedicated summary cards displaying personal best score and WPM for each of the 4 arsenal modes.
- Filterable Flight Log Table: Filterable by ALL MODES, MODE 1, MODE 2, MODE 3, and MODE 4.
- Displays timestamp, mode badge, score (with `★ PB` indicator on record attempts), WPM, accuracy, and max combo.
- Include a "PURGE LOGS" confirmation button to reset history.

---

### 7. Native Synthesized Web Audio (Zero Audio Assets)
Synthesize all retro sounds procedurally with the browser's Web Audio API (`AudioContext`):
- High-frequency laser shot for normal keystrokes
- Heavy metallic thump / explosion on word elimination
- High-pitched dual-tone chime on red bonus word spawn
- Low crunch / screen shake buzz on damage impact
- Multi-tone triumphant fanfare for new records
- Soft retro terminal click on UI buttons and menus
- Audio ON/OFF mute toggle with persistent state

---

### Technical Constraints & File Organization
Organize cleanly into dedicated files:
- `index.html`: Complete semantic structure, HUD, canvas containers, and terminal screen sections.
- `style.css`: CRT scanlines, phosphor glow, responsive layout, aspect ratio constraints (Auto, 16:9, 4:3), and compact typography.
- `js/words.js`: Word dictionaries for all 4 modes, expressions, arithmetic combinations, and exclusion manager.
- `js/audio.js`: Web Audio API sound synthesizer and volume control.
- `js/storage.js`: Pure `localStorage` engine for player profile, attempt history, and record tracking.
- `js/game.js`: 60 FPS Canvas 2D engine, turret rotation, bullet physics, lowest-first targeting, and particle system.
- `js/app.js`: State machine, aspect ratio controller, keyboard routing, screen transitions, and debriefing.

Keep the game keyboard-first, responsive, and performant. Deliver the authentic tactile experience of an 80s/90s DOS arcade military typing terminal.