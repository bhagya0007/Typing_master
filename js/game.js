/**
 * TYPE//TANK - Canvas 2D Real-Time Ballistic Defense Arena
 * Features:
 * - Semicircular armored tank with 180° smooth rotating cannon turret
 * - Recoil physics, muzzle flashes, and ballistic tracer projectiles
 * - Automatic Lowest-First target lock prioritization
 * - Faded typed letters (~35-40% opacity) and glowing active cursors
 * - High-threat Red Bonus targets with 3.5x multiplier and tactical exclusions
 * - Perimeter breaches, hull integrity states, and screen shake impacts
 * - Progressive difficulty scaling and live telemetry HUD
 */

class GameEngine {
  constructor(canvas, hudElements, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hudElements;
    this.callbacks = callbacks; // onGameOver, onScoreUpdate, etc.

    // Arena dimensions
    this.width = canvas.width;
    this.height = canvas.height;

    // Tank dimensions & state
    this.tankX = this.width / 2;
    this.tankY = this.height - 36;
    this.perimeterY = this.height - 72;
    this.turretAngle = -Math.PI / 2; // -90 deg (pointing straight up)
    this.targetTurretAngle = -Math.PI / 2;
    this.recoilDist = 0;
    this.muzzleFlashes = [];

    // Entities
    this.words = [];
    this.activeTarget = null;
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];

    // Game stats & telemetry
    this.mode = 1;
    this.health = 100;
    this.maxHealth = 100;
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.wordsDestroyed = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.isDead = false;

    // Spawning & Difficulty
    this.spawnTimer = 0;
    this.spawnInterval = 2600; // ms
    this.baseSpeed = 0.55; // px per frame
    this.wordIdCounter = 1;
    this.shakeIntensity = 0;

    // Bound loop
    this.animationFrameId = null;
    this.lastFrameTime = 0;
  }

  /**
   * Resize and recalibrate coordinate system
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    this.tankX = this.width / 2;
    this.tankY = this.height - 36;
    this.perimeterY = this.height - 72;

    // Clamp active words within new horizontal boundaries
    const margin = 80;
    this.words.forEach(w => {
      if (w.x + w.measuredWidth > this.width - margin) {
        w.x = Math.max(margin, this.width - margin - w.measuredWidth);
      }
    });
  }

  /**
   * Start a new combat sortie
   */
  start(mode = 1) {
    this.mode = mode;
    this.health = 100;
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.wordsDestroyed = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.startTime = performance.now();
    this.elapsedTime = 0;

    this.words = [];
    this.activeTarget = null;
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.muzzleFlashes = [];

    this.spawnTimer = 400; // spawn first word quickly
    this.spawnInterval = 2800;
    this.baseSpeed = 0.55;
    this.shakeIntensity = 0;

    this.isRunning = true;
    this.isPaused = false;
    this.isDead = false;

    if (window.WordManager) {
      window.WordManager.reset();
    }

    this.updateHUD();

    this.lastFrameTime = performance.now();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.loop(this.lastFrameTime);
  }

  /**
   * Stop/abort simulation
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Pause / Resume toggle
   */
  togglePause() {
    if (!this.isRunning || this.isDead) return false;
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.lastFrameTime = performance.now();
      this.loop(this.lastFrameTime);
    }
    return this.isPaused;
  }

  /**
   * Process a player keystroke with Lowest-First target resolution
   * @param {string} char 
   */
  handleKeystroke(char) {
    if (!this.isRunning || this.isPaused || this.isDead) return;
    if (!char || char.length !== 1) return;

    this.totalKeystrokes++;

    // Case 1: An active target word is already locked
    if (this.activeTarget) {
      const target = this.activeTarget;
      const expectedChar = target.text.charAt(target.typedIndex);

      if (char === expectedChar) {
        // Correct next character!
        this.correctKeystrokes++;
        target.typedIndex++;
        this.score += 10 * this.combo;

        // Fire projectile from cannon to exact letter position
        this.fireBulletAtLetter(target, target.typedIndex - 1);
        window.SoundEngine.playLaser();

        // Check if word is completely neutralized
        if (target.typedIndex >= target.text.length) {
          this.destroyWord(target);
        }
      } else {
        // Mistype while locked on target
        this.handleMistype(target);
      }
    } 
    // Case 2: No active target locked yet. Must scan all falling words for matches
    else {
      // Find all falling words starting with this character
      const matchingWords = this.words.filter(w => w.text.charAt(0) === char);

      if (matchingWords.length > 0) {
        // Automatic Lowest-First Priority: sort descending by Y coordinate (highest Y = lowest on screen)
        matchingWords.sort((a, b) => b.y - a.y);
        const lowestWord = matchingWords[0];

        // Lock onto this lowest word
        this.activeTarget = lowestWord;
        this.correctKeystrokes++;
        lowestWord.typedIndex = 1;
        this.score += 10 * this.combo;

        // Fire bullet at first letter
        this.fireBulletAtLetter(lowestWord, 0);
        window.SoundEngine.playLaser();

        // If it's a single-character word, immediately destroy it
        if (lowestWord.typedIndex >= lowestWord.text.length) {
          this.destroyWord(lowestWord);
        }
      } else {
        // No visible word begins with this character
        this.handleMistype(null);
      }
    }

    this.updateHUD();
  }

  /**
   * Handle an incorrect key press
   */
  handleMistype(target) {
    window.SoundEngine.playError();
    this.combo = 1; // Reset combo multiplier
    if (target) {
      target.errorFlash = 12; // Frames of red shake
    }
  }

  /**
   * Fire a ballistic projectile from the cannon barrel to the specified letter
   */
  fireBulletAtLetter(word, charIndex) {
    // Measure character position on screen
    const charPos = this.getCharWorldPosition(word, charIndex);

    // Aim turret directly at target letter
    const dx = charPos.x - this.tankX;
    const dy = charPos.y - (this.tankY - 14);
    this.targetTurretAngle = Math.atan2(dy, dx);

    // Clamp angle to upper 180° arc (-180° to 0°)
    if (this.targetTurretAngle > 0) {
      this.targetTurretAngle = dx >= 0 ? 0 : -Math.PI;
    }

    // Trigger cannon recoil
    this.recoilDist = 12;

    // Calculate muzzle origin point
    const barrelLength = 38;
    const muzzleX = this.tankX + Math.cos(this.targetTurretAngle) * barrelLength;
    const muzzleY = (this.tankY - 14) + Math.sin(this.targetTurretAngle) * barrelLength;

    // Create muzzle flash particle burst
    this.muzzleFlashes.push({
      x: muzzleX,
      y: muzzleY,
      angle: this.targetTurretAngle,
      life: 6,
      maxLife: 6
    });

    // Spawn projectile
    const speed = 22; // High-velocity plasma tracer
    const pAngle = Math.atan2(charPos.y - muzzleY, charPos.x - muzzleX);

    this.projectiles.push({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(pAngle) * speed,
      vy: Math.sin(pAngle) * speed,
      targetX: charPos.x,
      targetY: charPos.y,
      wordRef: word,
      charIndex: charIndex,
      isBonus: word.isBonus,
      trail: []
    });
  }

  /**
   * Calculate exact world coordinate of a letter within a word card
   */
  getCharWorldPosition(word, charIndex) {
    this.ctx.font = 'bold 18px "Share Tech Mono", "VT323", "Courier New", monospace';
    const subStr = word.text.substring(0, charIndex);
    const offsetWidth = this.ctx.measureText(subStr).width;
    const charWidth = this.ctx.measureText(word.text.charAt(charIndex)).width;

    return {
      x: word.x + 14 + offsetWidth + charWidth / 2,
      y: word.y + 12
    };
  }

  /**
   * Neutralize and destroy a word completely
   */
  destroyWord(word) {
    this.wordsDestroyed++;
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Base score = word length * 25
    let wordScore = word.text.length * 25 * this.combo;
    if (word.isBonus) {
      wordScore = Math.round(wordScore * 3.5); // 3.5x Bonus Multiplier!
      window.WordManager.triggerRedCooldown(word.text.charAt(0));
    }
    this.score += wordScore;

    // Audio explosion
    window.SoundEngine.playExplosion(word.isBonus);

    // Spawn mechanical explosion particles
    const centerX = word.x + word.measuredWidth / 2;
    const centerY = word.y + 12;
    this.createExplosion(centerX, centerY, word.isBonus);

    // Spawn floating score indicator
    this.floatingTexts.push({
      x: centerX,
      y: centerY - 10,
      text: word.isBonus ? `+${wordScore} [3.5X BONUS!]` : `+${wordScore}`,
      color: word.isBonus ? '#ff2244' : '#00ff66',
      vy: -1.2,
      life: 45,
      maxLife: 45
    });

    // Remove word from active words list
    this.words = this.words.filter(w => w !== word);
    if (this.activeTarget === word) {
      this.activeTarget = null;
    }
  }

  /**
   * Create explosive debris, sparks, and shockwaves
   */
  createExplosion(x, y, isBonus) {
    const particleCount = isBonus ? 45 : 28;
    const baseColor = isBonus ? '#ff2244' : '#00ff66';
    const altColor = isBonus ? '#ffbb00' : '#88ffaa';

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 1.5,
        color: Math.random() > 0.4 ? baseColor : altColor,
        life: Math.floor(Math.random() * 25) + 15,
        maxLife: 40,
        decay: Math.random() * 0.04 + 0.02
      });
    }

    // Expanding shockwave ring
    this.particles.push({
      x: x,
      y: y,
      radius: 4,
      maxRadius: isBonus ? 55 : 38,
      color: baseColor,
      isShockwave: true,
      life: 18,
      maxLife: 18
    });
  }

  /**
   * Spawn a new falling word threat
   */
  spawnWord() {
    // Determine if this should be a Red Bonus target (~15% chance, if none currently active)
    const hasActiveBonus = this.words.some(w => w.isBonus);
    const isBonus = !hasActiveBonus && Math.random() < 0.16;

    const text = window.WordManager.generateWord(this.mode, this.words, isBonus);
    if (!text) return;

    this.ctx.font = 'bold 18px "Share Tech Mono", "VT323", "Courier New", monospace';
    const textWidth = this.ctx.measureText(text).width;
    const cardWidth = textWidth + 28;

    // Distribute horizontally across playable lanes with padding
    const padding = 36;
    const maxAvailableX = Math.max(padding, this.width - cardWidth - padding);
    
    // Attempt to pick an X position that does not heavily overlap existing top words
    let bestX = padding + Math.random() * (maxAvailableX - padding);
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateX = padding + Math.random() * (maxAvailableX - padding);
      const overlap = this.words.some(w => w.y < 90 && Math.abs(w.x - candidateX) < cardWidth * 0.85);
      if (!overlap) {
        bestX = candidateX;
        break;
      }
    }

    // Speed calculation: Red bonus targets fall ~1.65x faster
    const progressionMult = 1 + (this.wordsDestroyed * 0.025);
    const speed = (this.baseSpeed * (isBonus ? 1.65 : 1.0)) * progressionMult;

    const wordObj = {
      id: this.wordIdCounter++,
      text: text,
      isBonus: isBonus,
      x: bestX,
      y: -24,
      measuredWidth: cardWidth,
      speed: speed,
      typedIndex: 0,
      errorFlash: 0
    };

    this.words.push(wordObj);

    // If Red Bonus target, play distinct high-pitched alert chime!
    if (isBonus) {
      window.SoundEngine.playRedSpawn();
    }
  }

  /**
   * Word reaches bottom perimeter defense line: DETONATE & DAMAGE HULL
   */
  handlePerimeterBreach(word) {
    const damage = word.isBonus ? 30 : 20;
    this.health = Math.max(0, this.health - damage);

    // Audio & screen shake
    window.SoundEngine.playDamage();
    this.shakeIntensity = word.isBonus ? 18 : 12;

    // If red bonus reached perimeter, start cooldown exclusion
    if (word.isBonus) {
      window.WordManager.triggerRedCooldown(word.text.charAt(0));
    }

    // Breach explosion at perimeter
    this.createExplosion(word.x + word.measuredWidth / 2, this.perimeterY, true);

    // Floating damage text
    this.floatingTexts.push({
      x: word.x + word.measuredWidth / 2,
      y: this.perimeterY - 20,
      text: `PERIMETER BREACH! -${damage}%`,
      color: '#ff2244',
      vy: -1.5,
      life: 50,
      maxLife: 50
    });

    // Reset combo
    this.combo = 1;

    // If target was breached, clear lock
    if (this.activeTarget === word) {
      this.activeTarget = null;
    }

    // Remove word
    this.words = this.words.filter(w => w !== word);

    this.updateHUD();

    // Check if tank hull is destroyed
    if (this.health <= 0) {
      this.triggerTankDestruction();
    }
  }

  /**
   * Catastrophic Tank Destruction Sequence
   */
  triggerTankDestruction() {
    this.isDead = true;
    window.SoundEngine.playExplosion(true);
    this.shakeIntensity = 28;

    // Massive multi-burst explosions at tank base
    for (let burst = 0; burst < 4; burst++) {
      setTimeout(() => {
        if (!this.isRunning) return;
        this.createExplosion(
          this.tankX + (Math.random() - 0.5) * 50,
          this.tankY + (Math.random() - 0.5) * 30,
          true
        );
        window.SoundEngine.playExplosion(true);
      }, burst * 160);
    }

    // Delay debriefing transition to let the destruction particles play out
    setTimeout(() => {
      this.stop();
      if (this.callbacks.onGameOver) {
        this.callbacks.onGameOver(this.getFinalStats());
      }
    }, 1300);
  }

  /**
   * Get final sortie metrics for Debrief screen
   */
  getFinalStats() {
    const elapsedMinutes = Math.max(0.05, (performance.now() - this.startTime) / 60000);
    const wpm = Math.round((this.correctKeystrokes / 5) / elapsedMinutes);
    const accuracy = this.totalKeystrokes > 0 
      ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100) 
      : 100;

    return {
      score: this.score,
      wpm: wpm,
      accuracy: accuracy,
      wordsDestroyed: this.wordsDestroyed,
      maxCombo: this.maxCombo,
      durationSeconds: Math.round((performance.now() - this.startTime) / 1000),
      mode: this.mode
    };
  }

  /**
   * Update top telemetry HUD bar
   */
  updateHUD() {
    if (!this.hud) return;

    if (this.hud.score) {
      this.hud.score.textContent = this.score.toString().padStart(6, '0');
    }
    if (this.hud.combo) {
      this.hud.combo.textContent = `x${this.combo}`;
      this.hud.combo.style.color = this.combo > 1 ? '#ffcc00' : '#00ff66';
    }

    const elapsedMinutes = Math.max(0.02, (performance.now() - this.startTime) / 60000);
    const liveWpm = Math.round((this.correctKeystrokes / 5) / elapsedMinutes);
    if (this.hud.wpm) {
      this.hud.wpm.textContent = liveWpm.toString();
    }

    const liveAcc = this.totalKeystrokes > 0 
      ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100) 
      : 100;
    if (this.hud.acc) {
      this.hud.acc.textContent = `${liveAcc}%`;
    }

    if (this.hud.healthBar && this.hud.healthText) {
      const pct = Math.max(0, this.health);
      this.hud.healthBar.style.width = `${pct}%`;
      this.hud.healthText.textContent = `${pct}%`;

      // Color-reactive states: Green > 50%, Amber 25-50%, Critical Red < 25%
      if (pct > 50) {
        this.hud.healthBar.style.backgroundColor = '#00ff66';
        this.hud.healthBar.style.boxShadow = '0 0 8px #00ff66';
      } else if (pct > 25) {
        this.hud.healthBar.style.backgroundColor = '#ffaa00';
        this.hud.healthBar.style.boxShadow = '0 0 8px #ffaa00';
      } else {
        this.hud.healthBar.style.backgroundColor = '#ff2244';
        this.hud.healthBar.style.boxShadow = '0 0 8px #ff2244';
      }
    }
  }

  /**
   * Main 60 FPS Canvas Game Loop
   */
  loop(timestamp) {
    if (!this.isRunning) return;

    const dt = Math.min(50, timestamp - this.lastFrameTime);
    this.lastFrameTime = timestamp;

    if (!this.isPaused) {
      this.update(dt);
    }
    this.render();

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  /**
   * Physics & Simulation Update
   */
  update(dt) {
    // 1. Spawning timer
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnWord();
      // Difficulty: spawn interval decreases as score grows
      const intervalScale = Math.max(1250, this.spawnInterval - (this.wordsDestroyed * 25));
      this.spawnTimer = intervalScale + (Math.random() * 400 - 200);
    }

    // 2. Turret smooth rotation interpolation
    if (this.activeTarget) {
      const center = this.getCharWorldPosition(this.activeTarget, this.activeTarget.typedIndex);
      const dx = center.x - this.tankX;
      const dy = center.y - (this.tankY - 14);
      this.targetTurretAngle = Math.atan2(dy, dx);
      if (this.targetTurretAngle > 0) {
        this.targetTurretAngle = dx >= 0 ? 0 : -Math.PI;
      }
    } else {
      // Default: track lowest falling threat or point straight up (-PI/2)
      if (this.words.length > 0) {
        const sorted = [...this.words].sort((a, b) => b.y - a.y);
        const lowest = sorted[0];
        const dx = (lowest.x + lowest.measuredWidth / 2) - this.tankX;
        const dy = (lowest.y + 12) - (this.tankY - 14);
        this.targetTurretAngle = Math.atan2(dy, dx);
        if (this.targetTurretAngle > 0) {
          this.targetTurretAngle = dx >= 0 ? 0 : -Math.PI;
        }
      } else {
        this.targetTurretAngle = -Math.PI / 2;
      }
    }

    // Angular lerp
    let diff = this.targetTurretAngle - this.turretAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.turretAngle += diff * 0.22;

    // Cannon recoil recovery
    if (this.recoilDist > 0) {
      this.recoilDist = Math.max(0, this.recoilDist - 1.2);
    }

    // 3. Falling words update
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      w.y += w.speed * (dt / 16.667);

      if (w.errorFlash > 0) {
        w.errorFlash--;
      }

      // Check perimeter breach
      if (w.y >= this.perimeterY) {
        this.handlePerimeterBreach(w);
      }
    }

    // 4. Projectiles update
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 5) p.trail.pop();

      p.x += p.vx;
      p.y += p.vy;

      // Distance to target
      const dist = Math.hypot(p.targetX - p.x, p.targetY - p.y);
      if (dist < 20 || p.y <= p.targetY) {
        // Impact!
        this.projectiles.splice(i, 1);

        // Spawn hit spark burst
        const sparkColor = p.isBonus ? '#ff2244' : '#00ff66';
        for (let s = 0; s < 7; s++) {
          const sAngle = Math.random() * Math.PI * 2;
          const sSpeed = Math.random() * 3 + 1;
          this.particles.push({
            x: p.targetX,
            y: p.targetY,
            vx: Math.cos(sAngle) * sSpeed,
            vy: Math.sin(sAngle) * sSpeed,
            size: 2,
            color: sparkColor,
            life: 10,
            maxLife: 10
          });
        }
      }
    }

    // 5. Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      if (part.isShockwave) {
        part.radius += (part.maxRadius - part.radius) * 0.18;
        part.life--;
        if (part.life <= 0) this.particles.splice(i, 1);
      } else {
        part.x += part.vx;
        part.y += part.vy;
        part.life--;
        if (part.life <= 0) this.particles.splice(i, 1);
      }
    }

    // 6. Muzzle flashes update
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      const mf = this.muzzleFlashes[i];
      mf.life--;
      if (mf.life <= 0) this.muzzleFlashes.splice(i, 1);
    }

    // 7. Floating texts update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life--;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // 8. Screen shake decay
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - 0.8);
    }
  }

  /**
   * Canvas 2D Graphics Rendering
   */
  render() {
    this.ctx.save();

    // Clear canvas
    this.ctx.fillStyle = '#020502';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Apply screen shake
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(sx, sy);
    }

    // 1. Draw tactical radar grid & range rings
    this.drawTacticalGrid();

    // 2. Draw defense perimeter line
    this.drawDefensePerimeter();

    // 3. Draw targeting laser guide line if active target exists
    if (this.activeTarget) {
      this.drawTargetingLaser();
    }

    // 4. Draw falling words
    this.drawWords();

    // 5. Draw ballistic projectiles & tracers
    this.drawProjectiles();

    // 6. Draw particles & shockwaves
    this.drawParticles();

    // 7. Draw semicircular tank & rotating turret
    this.drawTank();

    // 8. Draw floating score & combat text
    this.drawFloatingTexts();

    // 9. If paused, draw tactical pause overlay
    if (this.isPaused) {
      this.drawPauseOverlay();
    }

    this.ctx.restore();
  }

  /**
   * Tactical Radar Grid & Range Rings
   */
  drawTacticalGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 255, 102, 0.05)';
    this.ctx.lineWidth = 1;

    // Vertical scan lines
    const colStep = 75;
    for (let x = colStep; x < this.width; x += colStep) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    // Horizontal grid lines
    const rowStep = 60;
    for (let y = rowStep; y < this.height; y += rowStep) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    // Range rings centered at tank base
    const ringRadii = [160, 320, 480];
    this.ctx.strokeStyle = 'rgba(0, 255, 102, 0.08)';
    ringRadii.forEach((r, idx) => {
      this.ctx.beginPath();
      this.ctx.arc(this.tankX, this.tankY, r, Math.PI, 2 * Math.PI);
      this.ctx.stroke();

      // Range text mark
      this.ctx.fillStyle = 'rgba(0, 255, 102, 0.2)';
      this.ctx.font = '10px "Share Tech Mono", monospace';
      this.ctx.fillText(`RNG: ${(idx + 1) * 100}M`, this.tankX - r + 8, this.tankY - 4);
    });

    this.ctx.restore();
  }

  /**
   * Defense Perimeter Line at Bottom
   */
  drawDefensePerimeter() {
    this.ctx.save();
    const y = this.perimeterY;

    // Glowing hazard line
    this.ctx.strokeStyle = 'rgba(255, 34, 68, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 6]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.width, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Warning text
    this.ctx.fillStyle = 'rgba(255, 34, 68, 0.45)';
    this.ctx.font = '10px "Share Tech Mono", monospace';
    this.ctx.fillText('// DEFENSE PERIMETER // DO NOT BREACH //', 16, y - 6);
    this.ctx.fillText('// MAXIMUM FIRING LINE //', this.width - 180, y - 6);

    this.ctx.restore();
  }

  /**
   * Targeting laser guide line from cannon muzzle to active word
   */
  drawTargetingLaser() {
    if (!this.activeTarget) return;
    this.ctx.save();

    const charPos = this.getCharWorldPosition(this.activeTarget, this.activeTarget.typedIndex);
    this.ctx.strokeStyle = this.activeTarget.isBonus ? 'rgba(255, 34, 68, 0.35)' : 'rgba(0, 255, 102, 0.35)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([4, 4]);

    this.ctx.beginPath();
    this.ctx.moveTo(this.tankX, this.tankY - 14);
    this.ctx.lineTo(charPos.x, charPos.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Render falling threat words
   */
  drawWords() {
    this.ctx.save();
    this.ctx.font = 'bold 18px "Share Tech Mono", "VT323", "Courier New", monospace';
    this.ctx.textBaseline = 'middle';

    for (const w of this.words) {
      const isTargeted = (this.activeTarget === w);
      let cardX = w.x;
      let cardY = w.y;

      // Jitter if mistype error flash
      if (w.errorFlash > 0) {
        cardX += (Math.random() - 0.5) * 6;
      }

      const cardH = 30;
      const cardW = w.measuredWidth;

      // Card Background Box
      this.ctx.fillStyle = w.isBonus 
        ? (isTargeted ? 'rgba(40, 10, 15, 0.85)' : 'rgba(25, 5, 8, 0.75)')
        : (isTargeted ? 'rgba(5, 30, 12, 0.85)' : 'rgba(3, 16, 6, 0.75)');
      this.ctx.fillRect(cardX, cardY, cardW, cardH);

      // Card Border & Reticle Corners
      const borderColor = w.errorFlash > 0 
        ? '#ff2244' 
        : (w.isBonus ? '#ff2244' : (isTargeted ? '#00ff66' : 'rgba(0, 255, 102, 0.45)'));

      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = isTargeted ? 2 : 1;
      this.ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Draw DOS Reticle brackets for targeted or bonus words
      if (isTargeted || w.isBonus) {
        const cornerLen = 6;
        this.ctx.strokeStyle = w.isBonus ? '#ff3b5c' : '#00ff66';
        this.ctx.lineWidth = 2;

        // Top-left
        this.ctx.beginPath();
        this.ctx.moveTo(cardX - 4, cardY + cornerLen);
        this.ctx.lineTo(cardX - 4, cardY - 4);
        this.ctx.lineTo(cardX + cornerLen, cardY - 4);
        this.ctx.stroke();

        // Top-right
        this.ctx.beginPath();
        this.ctx.moveTo(cardX + cardW - cornerLen, cardY - 4);
        this.ctx.lineTo(cardX + cardW + 4, cardY - 4);
        this.ctx.lineTo(cardX + cardW + 4, cardY + cornerLen);
        this.ctx.stroke();

        // Bottom-left
        this.ctx.beginPath();
        this.ctx.moveTo(cardX - 4, cardY + cardH - cornerLen);
        this.ctx.lineTo(cardX - 4, cardY + cardH + 4);
        this.ctx.lineTo(cardX + cornerLen, cardY + cardH + 4);
        this.ctx.stroke();

        // Bottom-right
        this.ctx.beginPath();
        this.ctx.moveTo(cardX + cardW - cornerLen, cardY + cardH + 4);
        this.ctx.lineTo(cardX + cardW + 4, cardY + cardH + 4);
        this.ctx.lineTo(cardX + cardW + 4, cardY + cardH - cornerLen);
        this.ctx.stroke();

        // If targeted, draw lock-on indicator badge above
        if (isTargeted) {
          this.ctx.fillStyle = '#00ff66';
          this.ctx.font = '9px "Share Tech Mono", monospace';
          this.ctx.fillText('[LOCKED]', cardX, cardY - 8);
        }
      }

      // If Red Bonus target, draw "[!] 3.5X" tag
      if (w.isBonus) {
        this.ctx.fillStyle = '#ff2244';
        this.ctx.font = '9px "Share Tech Mono", monospace';
        this.ctx.fillText('★ [!] 3.5X THREAT', cardX, cardY + cardH + 11);
      }

      // Draw Characters:
      // - Typed chars: ~35-40% faded opacity
      // - Active next char: glowing cursor underline
      // - Remaining chars: crisp bright text
      this.ctx.font = 'bold 18px "Share Tech Mono", "VT323", "Courier New", monospace';
      let textCursorX = cardX + 14;
      const textY = cardY + cardH / 2;

      for (let i = 0; i < w.text.length; i++) {
        const char = w.text.charAt(i);
        const charWidth = this.ctx.measureText(char).width;

        if (i < w.typedIndex) {
          // Typed character: FADED TO ~35-40% OPACITY
          this.ctx.fillStyle = w.isBonus ? 'rgba(255, 60, 60, 0.38)' : 'rgba(0, 255, 102, 0.38)';
          this.ctx.fillText(char, textCursorX, textY);
        } else if (i === w.typedIndex && isTargeted) {
          // Current active target letter: BRIGHT WHITE-GREEN with glowing cursor
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillText(char, textCursorX, textY);

          // Glowing cursor underline
          this.ctx.fillStyle = w.isBonus ? '#ff2244' : '#00ff66';
          this.ctx.fillRect(textCursorX - 1, textY + 9, charWidth + 2, 2.5);
        } else {
          // Remaining untyped characters: CRISP BRIGHT
          this.ctx.fillStyle = w.isBonus ? '#ff2244' : '#00ff66';
          this.ctx.fillText(char, textCursorX, textY);
        }

        textCursorX += charWidth;
      }
    }

    this.ctx.restore();
  }

  /**
   * Render ballistic tracer bullets
   */
  drawProjectiles() {
    this.ctx.save();
    for (const p of this.projectiles) {
      const glowColor = p.isBonus ? '#ff2244' : '#00ff66';

      // Draw plasma tracer trail
      if (p.trail.length > 1) {
        this.ctx.strokeStyle = p.isBonus ? 'rgba(255, 34, 68, 0.45)' : 'rgba(0, 255, 102, 0.45)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        this.ctx.stroke();
      }

      // Draw projectile head
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  /**
   * Render explosive particles, shockwaves, and muzzle flashes
   */
  drawParticles() {
    this.ctx.save();

    // 1. Shockwaves
    for (const part of this.particles) {
      if (part.isShockwave) {
        this.ctx.strokeStyle = part.color;
        this.ctx.lineWidth = (part.life / part.maxLife) * 3;
        this.ctx.globalAlpha = part.life / part.maxLife;
        this.ctx.beginPath();
        this.ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }

    // 2. Solid Particles
    for (const part of this.particles) {
      if (!part.isShockwave) {
        this.ctx.fillStyle = part.color;
        this.ctx.globalAlpha = part.life / part.maxLife;
        this.ctx.beginPath();
        this.ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // 3. Muzzle Flashes
    for (const mf of this.muzzleFlashes) {
      this.ctx.save();
      this.ctx.translate(mf.x, mf.y);
      this.ctx.rotate(mf.angle);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = '#00ff66';
      this.ctx.shadowBlur = 12;

      // Starburst muzzle burst
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(16, -6);
      this.ctx.lineTo(24, 0);
      this.ctx.lineTo(16, 6);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  /**
   * Semicircular Tank Base & 180° Rotating Cannon Turret
   */
  drawTank() {
    this.ctx.save();
    const bx = this.tankX;
    const by = this.tankY;

    // A. Heavy Tread Base Blocks (Left & Right)
    this.ctx.fillStyle = '#0a1a0c';
    this.ctx.strokeStyle = '#00ff66';
    this.ctx.lineWidth = 1.5;

    // Left tread
    this.ctx.fillRect(bx - 56, by - 6, 24, 38);
    this.ctx.strokeRect(bx - 56, by - 6, 24, 38);
    // Right tread
    this.ctx.fillRect(bx + 32, by - 6, 24, 38);
    this.ctx.strokeRect(bx + 32, by - 6, 24, 38);

    // Tread segment lines
    this.ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
    for (let ty = by; ty < by + 32; ty += 8) {
      this.ctx.beginPath();
      this.ctx.moveTo(bx - 56, ty);
      this.ctx.lineTo(bx - 32, ty);
      this.ctx.moveTo(bx + 32, ty);
      this.ctx.lineTo(bx + 56, ty);
      this.ctx.stroke();
    }

    // Center Chassis Armor Plate
    this.ctx.fillStyle = '#061308';
    this.ctx.strokeStyle = '#00ff66';
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(bx - 36, by + 4, 72, 28);
    this.ctx.strokeRect(bx - 36, by + 4, 72, 28);

    // Chassis Hazard Stripes
    this.ctx.fillStyle = '#00ff66';
    this.ctx.font = '10px "Share Tech Mono", monospace';
    this.ctx.fillText('/// [MK-IV TANK] ///', bx - 50, by + 22);

    // B. Rotating Turret Cannon Assembly (Rotates -180° to 0°)
    const pivotY = by - 14;
    this.ctx.save();
    this.ctx.translate(bx, pivotY);
    this.ctx.rotate(this.turretAngle);

    // Cannon barrel with recoil offset
    const recoil = this.recoilDist;
    const barrelLen = 38;
    const barrelW = 12;

    // Dual recoil piston rods
    this.ctx.fillStyle = '#00441a';
    this.ctx.fillRect(-recoil, -barrelW / 2 - 3, barrelLen * 0.5, 2);
    this.ctx.fillRect(-recoil, barrelW / 2 + 1, barrelLen * 0.5, 2);

    // Main Heavy Barrel
    this.ctx.fillStyle = '#0a2410';
    this.ctx.strokeStyle = '#00ff66';
    this.ctx.lineWidth = 1.5;
    this.ctx.fillRect(-recoil, -barrelW / 2, barrelLen, barrelW);
    this.ctx.strokeRect(-recoil, -barrelW / 2, barrelLen, barrelW);

    // Muzzle brake tip
    this.ctx.fillStyle = '#00ff66';
    this.ctx.fillRect(barrelLen - recoil - 2, -barrelW / 2 - 2, 4, barrelW + 4);

    this.ctx.restore();

    // C. Semicircular Dome Turret
    const domeRadius = 34;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(bx, pivotY + 8, domeRadius, Math.PI, 0); // Semicircular dome
    this.ctx.closePath();

    // Dome gradient
    const domeGrad = this.ctx.createLinearGradient(bx, pivotY - domeRadius, bx, pivotY + 8);
    domeGrad.addColorStop(0, '#00ff66');
    domeGrad.addColorStop(0.3, '#0b3212');
    domeGrad.addColorStop(1, '#041006');
    this.ctx.fillStyle = domeGrad;
    this.ctx.fill();

    this.ctx.strokeStyle = '#00ff66';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Visor Optics Port (Center glowing slot)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#00ff66';
    this.ctx.shadowBlur = 10;
    this.ctx.fillRect(bx - 12, pivotY - 6, 24, 4);

    // Rivet details
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#00ff66';
    [-24, -14, 0, 14, 24].forEach(offset => {
      this.ctx.beginPath();
      this.ctx.arc(bx + offset, pivotY + 4, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();

    this.ctx.restore();
  }

  /**
   * Render floating score popups and tactical notifications
   */
  drawFloatingTexts() {
    this.ctx.save();
    this.ctx.font = 'bold 15px "Share Tech Mono", "VT323", monospace';
    this.ctx.textAlign = 'center';

    for (const ft of this.floatingTexts) {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = ft.life / ft.maxLife;
      this.ctx.shadowColor = ft.color;
      this.ctx.shadowBlur = 6;
      this.ctx.fillText(ft.text, ft.x, ft.y);
    }

    this.ctx.restore();
  }

  /**
   * Pause overlay
   */
  drawPauseOverlay() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(2, 6, 2, 0.88)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const boxW = Math.min(460, this.width - 40);
    const boxH = 140;
    this.ctx.strokeStyle = '#00ff66';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.width / 2 - boxW / 2, this.height / 2 - boxH / 2, boxW, boxH);

    this.ctx.fillStyle = '#00ff66';
    this.ctx.textAlign = 'center';
    this.ctx.font = '16px "Press Start 2P", "VT323", monospace';
    this.ctx.fillText('// SIMULATION PAUSED //', this.width / 2, this.height / 2 - 20);

    this.ctx.font = '13px "Share Tech Mono", monospace';
    this.ctx.fillStyle = '#a0ffa0';
    this.ctx.fillText('[P / SPACE] RESUME COMBAT SORTIE', this.width / 2, this.height / 2 + 15);
    this.ctx.fillStyle = '#ff6677';
    this.ctx.fillText('[ESC] ABORT SORTIE TO COMMAND BASE', this.width / 2, this.height / 2 + 38);

    this.ctx.restore();
  }
}

// Global instance
window.GameEngine = GameEngine;
