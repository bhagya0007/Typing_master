/**
 * TYPE//TANK - Application Controller & State Machine
 * Handles:
 * - Flow & screen navigation (Login, Settings, Instructions, Game, Debrief, Records)
 * - Full keyboard-first accessibility (Enter, Space, Esc, R, S)
 * - Header HUD toggles (Aspect Ratio, CRT, Audio, Callsign switch)
 * - Bi-directional mode card & granular character matrix synchronization
 * - Sortie debriefing, record celebration, and flight log filtering
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const cabinet = document.getElementById('arcade-cabinet');
  const screens = {
    login: document.getElementById('screen-login'),
    settings: document.getElementById('screen-settings'),
    instructions: document.getElementById('screen-instructions'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result'),
    records: document.getElementById('screen-records')
  };

  // Header HUD elements
  const hudCallsign = document.getElementById('hud-callsign');
  const btnSwitchCallsign = document.getElementById('btn-switch-callsign');
  const btnToggleAspect = document.getElementById('btn-toggle-aspect');
  const btnToggleCRT = document.getElementById('btn-toggle-crt');
  const btnToggleAudio = document.getElementById('btn-toggle-audio');

  // Login screen elements
  const callsignInput = document.getElementById('callsign-input');
  const btnLoginSubmit = document.getElementById('btn-login-submit');

  // Settings screen elements
  const modeCards = document.querySelectorAll('.mode-card');
  const toggleUpper = document.getElementById('chk-matrix-upper');
  const toggleNum = document.getElementById('chk-matrix-num');
  const toggleSpec = document.getElementById('chk-matrix-spec');
  const previewText = document.getElementById('arsenal-preview-text');
  const aspectButtons = document.querySelectorAll('.btn-aspect-select');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  // Instructions screen elements
  const btnStartCombat = document.getElementById('btn-start-combat');
  const btnBackSettings = document.getElementById('btn-back-settings');

  // Game screen elements
  const gameCanvas = document.getElementById('game-canvas');
  const canvasContainer = document.getElementById('canvas-container');
  const hudGame = {
    score: document.getElementById('stat-score'),
    combo: document.getElementById('stat-combo'),
    wpm: document.getElementById('stat-wpm'),
    acc: document.getElementById('stat-acc'),
    healthBar: document.getElementById('health-fill'),
    healthText: document.getElementById('health-pct-text')
  };

  // Debrief screen elements
  const resultBanner = document.getElementById('debrief-record-banner');
  const debriefScore = document.getElementById('debrief-score');
  const debriefWpm = document.getElementById('debrief-wpm');
  const debriefAcc = document.getElementById('debrief-acc');
  const debriefWords = document.getElementById('debrief-words');
  const debriefCombo = document.getElementById('debrief-combo');
  const debriefDuration = document.getElementById('debrief-duration');
  const debriefMode = document.getElementById('debrief-mode');
  const debriefPbDelta = document.getElementById('debrief-pb-delta');
  const btnDebriefRetry = document.getElementById('btn-debrief-retry');
  const btnDebriefRecords = document.getElementById('btn-debrief-records');
  const btnDebriefSettings = document.getElementById('btn-debrief-settings');
  const celebrationCanvas = document.getElementById('celebration-canvas');

  // Records screen elements
  const statLifeSorties = document.getElementById('stat-life-sorties');
  const statLifeScore = document.getElementById('stat-life-score');
  const statLifeWpm = document.getElementById('stat-life-wpm');
  const statLifeAcc = document.getElementById('stat-life-acc');
  const statLifeWords = document.getElementById('stat-life-words');
  const quadPbMode1 = document.getElementById('quad-pb-mode1');
  const quadPbMode2 = document.getElementById('quad-pb-mode2');
  const quadPbMode3 = document.getElementById('quad-pb-mode3');
  const quadPbMode4 = document.getElementById('quad-pb-mode4');
  const logFilterButtons = document.querySelectorAll('.btn-filter-mode');
  const flightLogTbody = document.getElementById('flight-log-tbody');
  const btnPurgeLogs = document.getElementById('btn-purge-logs');
  const btnBackFromRecords = document.getElementById('btn-back-from-records');

  // State
  let currentScreen = 'login';
  let activeFilterMode = 'all';
  let confettiAnimId = null;

  // Initialize Game Engine
  const game = new GameEngine(gameCanvas, hudGame, {
    onGameOver: (finalStats) => handleSortieDebrief(finalStats)
  });

  // --- Initialize App Preferences ---
  function initPreferences() {
    // Callsign
    const storedCallsign = window.StorageEngine.getCallsign();
    if (storedCallsign && storedCallsign !== 'PILOT_01') {
      hudCallsign.textContent = storedCallsign;
      callsignInput.value = storedCallsign;
    } else {
      hudCallsign.textContent = 'PILOT_01';
      callsignInput.value = 'PILOT_01';
    }

    // Aspect Ratio
    const currentAspect = window.StorageEngine.getAspectRatio();
    applyAspectRatio(currentAspect);

    // CRT Scanlines
    const crtEnabled = window.StorageEngine.getCRT();
    applyCRT(crtEnabled);

    // Audio
    const audioEnabled = window.StorageEngine.getAudio();
    applyAudio(audioEnabled);

    // Arsenal Mode
    const savedMode = window.StorageEngine.getMode();
    selectArsenalMode(savedMode, false);
  }

  // --- Aspect Ratio Controller ---
  function applyAspectRatio(ratio) {
    cabinet.classList.remove('ratio-auto', 'ratio-16-9', 'ratio-4-3');
    const valid = (ratio === '16-9' || ratio === '4-3') ? ratio : 'auto';
    cabinet.classList.add(`ratio-${valid}`);
    window.StorageEngine.setAspectRatio(valid);

    // Update Header Aspect button
    const labelMap = {
      'auto': 'RATIO: AUTO',
      '16-9': 'RATIO: 16:9',
      '4-3': 'RATIO: 4:3'
    };
    btnToggleAspect.textContent = `[ ${labelMap[valid]} ]`;

    // Update Settings aspect buttons
    aspectButtons.forEach(btn => {
      if (btn.dataset.ratio === valid) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Recalibrate canvas dimensions
    setTimeout(recalibrateCanvas, 50);
  }

  function cycleAspectRatio() {
    const current = window.StorageEngine.getAspectRatio();
    let next = 'auto';
    if (current === 'auto') next = '16-9';
    else if (current === '16-9') next = '4-3';
    else next = 'auto';

    window.SoundEngine.playClick();
    applyAspectRatio(next);
  }

  // --- CRT Scanline Controller ---
  function applyCRT(enabled) {
    if (enabled) {
      cabinet.classList.add('crt-on');
      btnToggleCRT.textContent = '[ CRT: ON ]';
      btnToggleCRT.classList.remove('off');
    } else {
      cabinet.classList.remove('crt-on');
      btnToggleCRT.textContent = '[ CRT: OFF ]';
      btnToggleCRT.classList.add('off');
    }
    window.StorageEngine.setCRT(enabled);
  }

  function toggleCRT() {
    window.SoundEngine.playClick();
    const cur = window.StorageEngine.getCRT();
    applyCRT(!cur);
  }

  // --- Audio Controller ---
  function applyAudio(enabled) {
    window.SoundEngine.setMuted(!enabled);
    window.StorageEngine.setAudio(enabled);
    if (enabled) {
      btnToggleAudio.textContent = '[ AUDIO: ON ]';
      btnToggleAudio.classList.remove('off');
    } else {
      btnToggleAudio.textContent = '[ AUDIO: OFF ]';
      btnToggleAudio.classList.add('off');
    }
  }

  function toggleAudio() {
    const newMuted = window.SoundEngine.toggleMute();
    applyAudio(!newMuted);
    if (!newMuted) {
      window.SoundEngine.playClick();
    }
  }

  // --- Canvas Recalibration ---
  function recalibrateCanvas() {
    if (!canvasContainer || !gameCanvas) return;
    const rect = canvasContainer.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);

    if (w > 0 && h > 0) {
      game.resize(w, h);
    }
  }

  window.addEventListener('resize', () => {
    recalibrateCanvas();
  });

  // --- Screen State Machine ---
  function showScreen(screenId) {
    window.SoundEngine.ensureContext();
    stopCelebration();

    if (currentScreen === 'game' && screenId !== 'game') {
      game.stop();
    }

    Object.keys(screens).forEach(id => {
      if (screens[id]) {
        screens[id].classList.remove('active');
      }
    });

    if (screens[screenId]) {
      screens[screenId].classList.add('active');
      currentScreen = screenId;
    }

    if (screenId === 'login') {
      setTimeout(() => callsignInput.focus(), 100);
    } else if (screenId === 'game') {
      recalibrateCanvas();
      const currentMode = window.StorageEngine.getMode();
      game.start(currentMode);
    } else if (screenId === 'records') {
      renderRecordsScreen();
    }
  }

  // --- Callsign / Login Handling ---
  function handleLoginSubmit() {
    window.SoundEngine.playClick();
    const raw = callsignInput.value.trim();
    const callsign = window.StorageEngine.setCallsign(raw || 'PILOT_01');
    hudCallsign.textContent = callsign;
    showScreen('settings');
  }

  btnLoginSubmit.addEventListener('click', handleLoginSubmit);
  callsignInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLoginSubmit();
    }
  });

  btnSwitchCallsign.addEventListener('click', () => {
    window.SoundEngine.playClick();
    showScreen('login');
  });

  // --- Arsenal Mode Selection & Bi-directional Matrix Sync ---
  function selectArsenalMode(modeNumber, playSfx = true) {
    if (playSfx) window.SoundEngine.playClick();
    const m = Math.max(1, Math.min(4, parseInt(modeNumber, 10) || 1));
    window.StorageEngine.setMode(m);

    // Update Mode Cards UI
    modeCards.forEach(card => {
      if (parseInt(card.dataset.mode, 10) === m) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Bi-directionally sync granular matrix checkboxes
    // Lowercase is always checked and disabled
    if (m === 1) {
      toggleUpper.checked = false;
      toggleNum.checked = false;
      toggleSpec.checked = false;
    } else if (m === 2) {
      toggleUpper.checked = true;
      toggleNum.checked = false;
      toggleSpec.checked = false;
    } else if (m === 3) {
      toggleUpper.checked = true;
      toggleNum.checked = true;
      toggleSpec.checked = false;
    } else if (m === 4) {
      toggleUpper.checked = true;
      toggleNum.checked = true;
      toggleSpec.checked = true;
    }

    // Update dynamic preview sample bar
    updateArsenalPreview(m);
  }

  function handleGranularMatrixChange() {
    window.SoundEngine.playClick();
    const hasUpper = toggleUpper.checked;
    const hasNum = toggleNum.checked;
    const hasSpec = toggleSpec.checked;

    let targetMode = 1;
    if (hasSpec) {
      // Specials require Mode 4
      targetMode = 4;
      toggleUpper.checked = true;
      toggleNum.checked = true;
    } else if (hasNum) {
      // Numbers require at least Mode 3
      targetMode = 3;
      toggleUpper.checked = true;
    } else if (hasUpper) {
      targetMode = 2;
    } else {
      targetMode = 1;
    }

    window.StorageEngine.setMode(targetMode);
    modeCards.forEach(card => {
      if (parseInt(card.dataset.mode, 10) === targetMode) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    updateArsenalPreview(targetMode);
  }

  function updateArsenalPreview(mode) {
    let samples = "";
    switch (mode) {
      case 1:
        samples = "tank radar artillery missile turret armor patrol bunker flank cannon strike";
        break;
      case 2:
        samples = "Tank RadarX DeltaForce AlphaTeam Viper GhostOps Spectre Titan StrikeOne";
        break;
      case 3:
        samples = "Squad5 Tank99 Delta7 Raptor01 (8+9) (4*3) Zone99 v2.0 M1A2 AK47 (15-7)";
        break;
      case 4:
        samples = "[tank-01] (8+9) {cmd-9} !alert! [DEF-99] <cyber> *STRIKE* #target1 {lock:1}";
        break;
    }
    previewText.textContent = `SAMPLES: ${samples}`;
  }

  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      const mode = parseInt(card.dataset.mode, 10);
      selectArsenalMode(mode, true);
    });
  });

  toggleUpper.addEventListener('change', handleGranularMatrixChange);
  toggleNum.addEventListener('change', handleGranularMatrixChange);
  toggleSpec.addEventListener('change', handleGranularMatrixChange);

  // Aspect ratio buttons on settings screen
  aspectButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      window.SoundEngine.playClick();
      applyAspectRatio(btn.dataset.ratio);
    });
  });

  btnSaveSettings.addEventListener('click', () => {
    window.SoundEngine.playClick();
    showScreen('instructions');
  });

  // Instructions screen buttons
  btnStartCombat.addEventListener('click', () => {
    window.SoundEngine.playClick();
    showScreen('game');
  });

  btnBackSettings.addEventListener('click', () => {
    window.SoundEngine.playClick();
    showScreen('settings');
  });

  // Header quick controls
  btnToggleAspect.addEventListener('click', cycleAspectRatio);
  btnToggleCRT.addEventListener('click', toggleCRT);
  btnToggleAudio.addEventListener('click', toggleAudio);

  // --- Sortie Debrief & Celebration ---
  function handleSortieDebrief(finalStats) {
    const callsign = window.StorageEngine.getCallsign();
    const result = window.StorageEngine.addRecord({
      callsign: callsign,
      mode: finalStats.mode,
      score: finalStats.score,
      wpm: finalStats.wpm,
      accuracy: finalStats.accuracy,
      wordsDestroyed: finalStats.wordsDestroyed,
      maxCombo: finalStats.maxCombo,
      durationSeconds: finalStats.durationSeconds
    });

    // Populate debrief metrics
    debriefScore.textContent = finalStats.score.toString().padStart(6, '0');
    debriefWpm.textContent = finalStats.wpm.toString();
    debriefAcc.textContent = `${finalStats.accuracy}%`;
    debriefWords.textContent = finalStats.wordsDestroyed.toString();
    debriefCombo.textContent = `x${finalStats.maxCombo}`;
    debriefDuration.textContent = `${finalStats.durationSeconds}s`;

    const modeLabels = { 1: 'MODE 1 [ALPHA]', 2: 'MODE 2 [BRAVO]', 3: 'MODE 3 [CHARLIE]', 4: 'MODE 4 [DELTA]' };
    debriefMode.textContent = modeLabels[finalStats.mode] || 'MODE 1';

    // Personal Best & Celebration Handling
    if (result.isPersonalBest) {
      resultBanner.className = 'record-banner-new';
      resultBanner.innerHTML = '★ ★ ★ NEW PERSONAL RECORD ACHIEVED! ★ ★ ★';
      debriefPbDelta.innerHTML = `<span class="tag-pb">NEW PB!</span> Previous Best: ${result.previousBestScore.toString().padStart(6, '0')} PTS (+${finalStats.score - result.previousBestScore} PTS)`;

      // Play triumphant victory fanfare
      window.SoundEngine.playFanfare();

      // Launch full-screen retro arcade confetti celebration!
      startCelebration();
    } else {
      resultBanner.className = 'record-banner-normal';
      resultBanner.innerHTML = '--- SORTIE DEBRIEF COMPLETE ---';
      const scoreDelta = finalStats.score - result.previousBestScore;
      const wpmDelta = finalStats.wpm - result.previousBestWpm;
      debriefPbDelta.textContent = `PERSONAL BEST: ${result.previousBestScore.toString().padStart(6, '0')} PTS | DELTA: ${scoreDelta} PTS (${wpmDelta >= 0 ? '+' : ''}${wpmDelta} WPM)`;
    }

    showScreen('result');
  }

  // Result screen buttons
  btnDebriefRetry.addEventListener('click', () => {
    window.SoundEngine.playClick();
    showScreen('game');
  });

  btnDebriefRecords.addEventListener('click', () => {
    window.SoundEngine.playClick();
    showScreen('records');
  });

  btnDebriefSettings.addEventListener('click', () => {
    window.SoundEngine.playClick();
    showScreen('settings');
  });

  // --- Retro Arcade Confetti Celebration Engine ---
  function startCelebration() {
    if (!celebrationCanvas) return;
    celebrationCanvas.width = window.innerWidth;
    celebrationCanvas.height = window.innerHeight;
    const cctx = celebrationCanvas.getContext('2d');

    const colors = ['#00ff66', '#ff2244', '#ffcc00', '#00e5ff', '#ffffff'];
    const confettiPieces = [];
    for (let i = 0; i < 90; i++) {
      confettiPieces.push({
        x: Math.random() * celebrationCanvas.width,
        y: Math.random() * -celebrationCanvas.height * 0.5,
        w: Math.random() * 8 + 4,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 2.5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15
      });
    }

    let frames = 0;
    function animate() {
      frames++;
      cctx.clearRect(0, 0, celebrationCanvas.width, celebrationCanvas.height);

      confettiPieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;

        if (p.y > celebrationCanvas.height) {
          p.y = -20;
          p.x = Math.random() * celebrationCanvas.width;
        }

        cctx.save();
        cctx.translate(p.x, p.y);
        cctx.rotate(p.rot);
        cctx.fillStyle = p.color;
        cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        cctx.restore();
      });

      if (frames < 360) {
        confettiAnimId = requestAnimationFrame(animate);
      } else {
        stopCelebration();
      }
    }

    stopCelebration();
    confettiAnimId = requestAnimationFrame(animate);
  }

  function stopCelebration() {
    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
      confettiAnimId = null;
    }
    if (celebrationCanvas) {
      const cctx = celebrationCanvas.getContext('2d');
      cctx.clearRect(0, 0, celebrationCanvas.width, celebrationCanvas.height);
    }
  }

  // --- Records / Flight Log Screen ---
  function renderRecordsScreen() {
    const callsign = window.StorageEngine.getCallsign();
    const stats = window.StorageEngine.getLifetimeStats(callsign);

    // Lifetime metrics
    statLifeSorties.textContent = stats.totalSorties.toString();
    statLifeScore.textContent = stats.bestScore.toString().padStart(6, '0');
    statLifeWpm.textContent = stats.maxWpm.toString();
    statLifeAcc.textContent = `${stats.avgAccuracy}%`;
    statLifeWords.textContent = stats.totalWordsDestroyed.toString();

    // Mode Bests Quad
    const pb1 = window.StorageEngine.getPersonalBest(1);
    const pb2 = window.StorageEngine.getPersonalBest(2);
    const pb3 = window.StorageEngine.getPersonalBest(3);
    const pb4 = window.StorageEngine.getPersonalBest(4);

    quadPbMode1.innerHTML = pb1 ? `BEST: <b>${pb1.score}</b> PTS<br>SPEED: <b>${pb1.wpm}</b> WPM` : 'NO DATA';
    quadPbMode2.innerHTML = pb2 ? `BEST: <b>${pb2.score}</b> PTS<br>SPEED: <b>${pb2.wpm}</b> WPM` : 'NO DATA';
    quadPbMode3.innerHTML = pb3 ? `BEST: <b>${pb3.score}</b> PTS<br>SPEED: <b>${pb3.wpm}</b> WPM` : 'NO DATA';
    quadPbMode4.innerHTML = pb4 ? `BEST: <b>${pb4.score}</b> PTS<br>SPEED: <b>${pb4.wpm}</b> WPM` : 'NO DATA';

    renderFlightLogTable();
  }

  function renderFlightLogTable() {
    flightLogTbody.innerHTML = '';
    const records = window.StorageEngine.getRecords();

    const filtered = activeFilterMode === 'all'
      ? records
      : records.filter(r => r.mode === parseInt(activeFilterMode, 10));

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="7" class="empty-log-cell">--- NO FLIGHT LOG ENTRIES RECORDED ---</td>`;
      flightLogTbody.appendChild(tr);
      return;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      const modeNames = { 1: 'ALPHA', 2: 'BRAVO', 3: 'CHARLIE', 4: 'DELTA' };
      const pbBadge = r.isPersonalBest ? `<span class="tag-pb">★ PB</span>` : ``;

      tr.innerHTML = `
        <td>${r.dateStr || 'RECENT'}</td>
        <td>${r.callsign || 'OPERATOR'}</td>
        <td><span class="mode-badge mode-${r.mode}">M${r.mode}: ${modeNames[r.mode] || 'M1'}</span></td>
        <td class="col-score">${r.score.toString().padStart(6, '0')} ${pbBadge}</td>
        <td>${r.wpm} WPM</td>
        <td>${r.accuracy}%</td>
        <td>x${r.maxCombo}</td>
      `;
      flightLogTbody.appendChild(tr);
    });
  }

  logFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      window.SoundEngine.playClick();
      logFilterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilterMode = btn.dataset.filter;
      renderFlightLogTable();
    });
  });

  btnPurgeLogs.addEventListener('click', () => {
    window.SoundEngine.playClick();
    if (confirm('CONFIRM DESTRUCTION: Purge all sortie flight logs and personal records permanently?')) {
      window.StorageEngine.purgeRecords();
      renderRecordsScreen();
    }
  });

  btnBackFromRecords.addEventListener('click', () => {
    window.SoundEngine.playClick();
    showScreen('settings');
  });

  // --- Global Keyboard Routing Engine ---
  window.addEventListener('keydown', (e) => {
    // If user is currently typing in an input field (callsign), allow standard input
    if (e.target.tagName === 'INPUT') {
      return;
    }

    // Active Combat Sortie Controls
    if (currentScreen === 'game') {
      if (game.isPaused) {
        if (e.key === 'Escape') {
          e.preventDefault();
          window.SoundEngine.playClick();
          game.stop();
          showScreen('settings');
          return;
        }
        if (e.key === 'p' || e.key === 'P' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          window.SoundEngine.playClick();
          game.togglePause();
          return;
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        window.SoundEngine.playClick();
        game.togglePause();
        return;
      }

      // If game is running and not paused, route real-time character typing
      if (game.isRunning && !game.isPaused) {
        // Ignore modifier keys
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.key.length === 1) {
          e.preventDefault();
          game.handleKeystroke(e.key);
        }
      }
      return;
    }

    // Debrief Screen Shortcuts
    if (currentScreen === 'result') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        window.SoundEngine.playClick();
        showScreen('game');
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        window.SoundEngine.playClick();
        showScreen('records');
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        window.SoundEngine.playClick();
        showScreen('settings');
        return;
      }
    }

    // Instructions Screen Shortcuts
    if (currentScreen === 'instructions') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        window.SoundEngine.playClick();
        showScreen('game');
        return;
      }
      if (e.key === 'Escape' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        window.SoundEngine.playClick();
        showScreen('settings');
        return;
      }
    }

    // Settings Screen Shortcuts
    if (currentScreen === 'settings') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.SoundEngine.playClick();
        showScreen('instructions');
        return;
      }
      if (e.key === '1') selectArsenalMode(1, true);
      if (e.key === '2') selectArsenalMode(2, true);
      if (e.key === '3') selectArsenalMode(3, true);
      if (e.key === '4') selectArsenalMode(4, true);
      return;
    }

    // Records Screen Shortcuts
    if (currentScreen === 'records') {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        window.SoundEngine.playClick();
        showScreen('settings');
        return;
      }
    }
  });

  // --- Initial Boot Sequence ---
  initPreferences();
  showScreen('login');
});
