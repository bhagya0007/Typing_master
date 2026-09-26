/**
 * TYPE//TANK - LocalStorage Engine & Flight Log Database
 * Handles callsign, aspect ratio, preferences, and performance history
 */

const STORAGE_KEYS = {
  CALLSIGN: 'typetank_callsign',
  ASPECT: 'typetank_aspect',
  CRT: 'typetank_crt',
  AUDIO: 'typetank_audio',
  MODE: 'typetank_mode',
  RECORDS: 'typetank_records'
};

class StorageEngine {
  constructor() {
    this.defaultCallsign = 'PILOT_01';
  }

  // --- Callsign ---
  getCallsign() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.CALLSIGN);
      return val && val.trim() ? val.trim().toUpperCase() : this.defaultCallsign;
    } catch (e) {
      return this.defaultCallsign;
    }
  }

  setCallsign(callsign) {
    try {
      const clean = (callsign || this.defaultCallsign).trim().toUpperCase().substring(0, 14);
      localStorage.setItem(STORAGE_KEYS.CALLSIGN, clean);
      return clean;
    } catch (e) {
      return this.defaultCallsign;
    }
  }

  // --- Aspect Ratio ('auto' | '16-9' | '4-3') ---
  getAspectRatio() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.ASPECT);
      if (val === '16-9' || val === '4-3' || val === 'auto') return val;
      return 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  setAspectRatio(ratio) {
    try {
      const valid = (ratio === '16-9' || ratio === '4-3') ? ratio : 'auto';
      localStorage.setItem(STORAGE_KEYS.ASPECT, valid);
      return valid;
    } catch (e) {
      return 'auto';
    }
  }

  // --- CRT Scanlines (boolean) ---
  getCRT() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.CRT);
      return val !== null ? val === 'true' : true; // Default ON
    } catch (e) {
      return true;
    }
  }

  setCRT(enabled) {
    try {
      localStorage.setItem(STORAGE_KEYS.CRT, enabled ? 'true' : 'false');
    } catch (e) {}
  }

  // --- Audio State (boolean) ---
  getAudio() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.AUDIO);
      return val !== null ? val === 'true' : true; // Default ON
    } catch (e) {
      return true;
    }
  }

  setAudio(enabled) {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIO, enabled ? 'true' : 'false');
    } catch (e) {}
  }

  // --- Arsenal Mode (1, 2, 3, 4) ---
  getMode() {
    try {
      const val = parseInt(localStorage.getItem(STORAGE_KEYS.MODE), 10);
      if (val >= 1 && val <= 4) return val;
      return 1;
    } catch (e) {
      return 1;
    }
  }

  setMode(mode) {
    try {
      const m = Math.max(1, Math.min(4, parseInt(mode, 10) || 1));
      localStorage.setItem(STORAGE_KEYS.MODE, m.toString());
      return m;
    } catch (e) {
      return 1;
    }
  }

  // --- Flight Log Records ---
  getRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Get Personal Best record for a specific mode or all modes
   * @param {number|null} mode 1..4 or null for overall
   * @returns {Object|null}
   */
  getPersonalBest(mode = null) {
    const records = this.getRecords();
    let filtered = records;
    if (mode !== null && mode >= 1 && mode <= 4) {
      filtered = records.filter(r => r.mode === mode);
    }
    if (filtered.length === 0) return null;
    return filtered.reduce((best, cur) => (cur.score > (best ? best.score : -1) ? cur : best), null);
  }

  /**
   * Save a newly completed sortie record
   * Calculates whether this attempt is a New Personal Best for this mode
   * @param {Object} recordData
   * @returns {{ record: Object, isPersonalBest: boolean, previousBestScore: number, previousBestWpm: number }}
   */
  addRecord(recordData) {
    const currentMode = recordData.mode || 1;
    const previousBest = this.getPersonalBest(currentMode);
    const previousBestScore = previousBest ? previousBest.score : 0;
    const previousBestWpm = previousBest ? previousBest.wpm : 0;

    const isPersonalBest = recordData.score > previousBestScore;

    const newRecord = {
      id: 'sortie_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      dateStr: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      callsign: recordData.callsign || this.getCallsign(),
      mode: currentMode,
      score: Math.max(0, Math.floor(recordData.score || 0)),
      wpm: Math.max(0, Math.round(recordData.wpm || 0)),
      accuracy: Math.max(0, Math.min(100, Math.round(recordData.accuracy || 0))),
      wordsDestroyed: Math.max(0, recordData.wordsDestroyed || 0),
      maxCombo: Math.max(1, recordData.maxCombo || 1),
      durationSeconds: Math.round(recordData.durationSeconds || 0),
      isPersonalBest: isPersonalBest
    };

    try {
      const records = this.getRecords();
      records.unshift(newRecord); // newest first
      // Cap at 150 records to prevent storage quota issues
      if (records.length > 150) records.length = 150;
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }

    return {
      record: newRecord,
      isPersonalBest,
      previousBestScore,
      previousBestWpm
    };
  }

  /**
   * Calculate lifetime aggregates for the operator
   * @param {string|null} callsign
   */
  getLifetimeStats(callsign = null) {
    let records = this.getRecords();
    if (callsign) {
      records = records.filter(r => r.callsign.toUpperCase() === callsign.toUpperCase());
    }

    if (records.length === 0) {
      return {
        totalSorties: 0,
        bestScore: 0,
        maxWpm: 0,
        avgAccuracy: 0,
        totalWordsDestroyed: 0
      };
    }

    let totalWords = 0;
    let bestScore = 0;
    let maxWpm = 0;
    let totalAcc = 0;

    records.forEach(r => {
      totalWords += r.wordsDestroyed || 0;
      if (r.score > bestScore) bestScore = r.score;
      if (r.wpm > maxWpm) maxWpm = r.wpm;
      totalAcc += r.accuracy || 0;
    });

    return {
      totalSorties: records.length,
      bestScore: bestScore,
      maxWpm: maxWpm,
      avgAccuracy: Math.round(totalAcc / records.length),
      totalWordsDestroyed: totalWords
    };
  }

  /**
   * Purge all flight log records
   */
  purgeRecords() {
    try {
      localStorage.removeItem(STORAGE_KEYS.RECORDS);
      return true;
    } catch (e) {
      return false;
    }
  }
}

// Global instance
window.StorageEngine = new StorageEngine();
