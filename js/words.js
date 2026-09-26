/**
 * TYPE//TANK - Word Repositories & Tactical Exclusion Engine
 * Supports 4 distinct Arsenal Modes + High-Threat Red Bonus Targets
 */

const WORDS_DATABASE = {
  // Mode 1 [Alpha]: Strictly Lowercase Tactical & Combat Vocabulary
  mode1: [
    "tank", "radar", "artillery", "missile", "turret", "armor", "patrol", "bunker",
    "flank", "target", "cannon", "strike", "sensor", "cipher", "matrix", "sector",
    "vector", "recon", "ballistic", "convoy", "barrage", "defend", "breach", "outpost",
    "charge", "impact", "velocity", "stealth", "squadron", "fortress", "trigger", "hazard",
    "danger", "perimeter", "assault", "combat", "shield", "laser", "tracker", "signal",
    "drone", "optics", "beacon", "chassis", "treads", "trench", "blast", "shrapnel",
    "mortar", "bullet", "volley", "sentry", "patriot", "walker", "escort", "sniper",
    "raider", "skirmish", "command", "frontline", "airdrop", "hangar", "supply", "depot",
    "payload", "warhead", "caliber", "muzzle", "recoil", "traverse", "elevation", "ricochet",
    "breacher", "infiltrate", "scout", "platoon", "infantry", "vanguard", "bulwark", "bastion",
    "garrison", "redoubt", "citadel", "arsenal", "armory", "flak", "torpedo", "depth",
    "submariner", "carrier", "cruiser", "corvette", "frigate", "destroyer", "battleship", "dread",
    "ballistics", "trajectory", "telemetry", "sonar", "infra", "thermal", "optronic", "avionics",
    "thruster", "booster", "afterburner", "emp", "jamming", "counter", "decoy", "flare",
    "chaff", "intercept", "evade", "dogfight", "sortie", "airborne", "paratroop", "commando",
    "sabotage", "grenade", "dynamite", "barricade", "sandbag", "razorwire", "minefield", "sweep",
    "containment", "quarantine", "lockdown", "override", "protocol", "frequency", "uplink", "downlink",
    "satellite", "terminal", "console", "firewall", "mainframe", "subroutine", "processor", "circuit"
  ],

  // Mode 2 [Bravo]: Lowercase + Uppercase (Military Callsigns, Acronyms, Tactical Units)
  mode2: [
    "Tank", "RadarX", "DeltaForce", "AlphaTeam", "Viper", "GhostOps", "Spectre", "Titan",
    "StrikeOne", "Havoc", "Overwatch", "IronClad", "WarHawk", "BlackOps", "FireBase", "TopGun",
    "NightStalker", "RedDawn", "AirLock", "BaseCamp", "CyberNet", "TaskForce", "BlueShift", "Aegis",
    "Apex", "Command", "GridLock", "ShockWave", "StormFront", "IronCurtain", "Valkyrie", "Phantom",
    "RogueSquad", "HeavyMetal", "ShadowRecon", "ZeroHour", "DeathValley", "EagleEye", "HellFire",
    "ThunderBolt", "WarMachine", "SteelRain", "WildCat", "OmegaPoint", "SiegeBreaker", "BattleCruiser",
    "SkyRanger", "StarFall", "DarkMatter", "DeepSpace", "BioHazard", "WarForge", "MechWarrior",
    "FrontLine", "HardPoint", "QuickSilver", "SilverBullet", "RapidFire", "CrossBow", "LongBow",
    "Sentinel", "Guardian", "Warlock", "Paladin", "Crusader", "Tempest", "Cyclone", "Tornado",
    "Hurricane", "Blizzard", "FireStorm", "SolarFlare", "NovaBlast", "SuperNova", "HyperDrive",
    "WarpCore", "Neutron", "Proton", "IonCannon", "PlasmaRifle", "RailGun", "PulseLaser", "GaussRifle"
  ],

  // Mode 3 [Charlie]: Lowercase + Uppercase + Numbers (Designators, Coordinates, Math Operations)
  mode3: [
    "Squad5", "Tank99", "Delta7", "Raptor01", "B52", "M1A2", "F22", "AK47",
    "Sector7G", "Viper12", "(8+9)", "(4*3)", "(15-7)", "Zone99", "v2.0", "Code808",
    "Unit404", "Base09", "Port8080", "Echo7", "Flight9", "Grid55", "Alpha01", "Sub100",
    "Route66", "(12/3)", "(7+14)", "(50-25)", "T800", "T1000", "Halo3", "XWing7",
    "Falcon9", "Apollo11", "Saturn5", "Area51", "Hangar18", "Gate3", "Bay04", "Level99",
    "HP500", "XP1000", "FPS60", "Ping12", "Chamber9", "Silo03", "Vault101", "Outpost32",
    "(9*9)", "(100-45)", "(33+77)", "GigaByte4", "RAM16", "CPU8", "CoreI7", "Ryzen9",
    "RX78", "Unit01", "Eva02", "Gundam00", "Starship1", "Orbiter3", "Shuttle5", "Rover07"
  ],

  // Mode 4 [Delta]: Lowercase + Uppercase + Numbers + Special Characters (Brackets, Math, Punctuation)
  mode4: [
    "[tank-01]", "(8+9)", "{cmd-9}", "!alert!", "[DEF-99]", "<cyber>", "*STRIKE*", "#target1",
    "[recon_x]", "{lock:1}", "!hazard!", "[f-35b]", "<t-90m>", "(100+25)", "[zone#4]", "{ping:80}",
    "!danger!", "[omega-9]", "<flank&destroy>", "*OVERLOAD*", "[alpha/bravo]", "(3.14*r)", "{root:admin}",
    "$bounty$", "[fire_wall]", "<sys_err>", "*CRITICAL*", "!breach!", "[squad#42]", "(2^8-1)",
    "{exit:0}", "#code_red#", "[m-109a6]", "<laser_on>", "*BARRAGE*", "!fall_back!", "[turret:99]",
    "(99*99)", "{kill-9}", "$jackpot$", "[armor+50]", "<emp_burst>", "*SHOCKWAVE*", "!detonate!",
    "[status:ok]", "(500-125)", "{mode:auto}", "#protocol_7#", "[sector-99]", "<reload_now>"
  ],

  // High-Threat Red Bonus Words (Descend faster, yield 3.5x multiplier)
  bonusWords: [
    "RED-ALERT", "CRIMSON-VIPER", "OVERLORD", "DEATH-RAY", "APOCALYPSE",
    "WAR-HAMMER", "BLOOD-HOUND", "EXTERMINATE", "OBLIVION", "DREADNOUGHT",
    "INFERNO", "HELL-HOUND", "MEGATRON", "DOOMSDAY", "FIRE-STORM",
    "DEVASTATOR", "HYDRA-99", "TITAN-X", "BERSERKER", "LEVIATHAN",
    "VOID-WALKER", "NIGHT-HAWK", "CHAOS-CORE", "ULTRA-VIOLET", "VORTEX-PRIME"
  ]
};

/**
 * Tactical Exclusion & Spawning Manager
 * Prevents duplicate starting characters for currently active falling words
 * And enforces a 3-second cooldown window when a Red Bonus target is active or resolved.
 */
class WordManager {
  constructor() {
    this.activeRedInitialChar = null;
    this.redCooldownChar = null;
    this.redCooldownUntil = 0;
  }

  /**
   * Set cooldown after Red Bonus target is resolved (hit or destroyed)
   * @param {string} initialChar 
   */
  triggerRedCooldown(initialChar) {
    this.activeRedInitialChar = null;
    if (initialChar) {
      this.redCooldownChar = initialChar.charAt(0);
      this.redCooldownUntil = Date.now() + 3000; // 3 second exclusion window
    }
  }

  /**
   * Check if a starting character is currently suppressed/excluded
   * @param {string} char 
   * @returns {boolean}
   */
  isCharExcluded(char) {
    if (!char) return false;
    const c = char.charAt(0);
    // Suppressed while red word is active
    if (this.activeRedInitialChar && this.activeRedInitialChar === c) {
      return true;
    }
    // Suppressed during 3-second cooldown
    if (this.redCooldownChar && this.redCooldownChar === c) {
      if (Date.now() < this.redCooldownUntil) {
        return true;
      } else {
        this.redCooldownChar = null;
        this.redCooldownUntil = 0;
      }
    }
    return false;
  }

  /**
   * Pick a valid word for the given mode and active words list
   * @param {number} mode (1, 2, 3, or 4)
   * @param {Array} activeWords (currently falling words)
   * @param {boolean} isBonus (whether this should be a Red Bonus target)
   * @returns {string|null}
   */
  generateWord(mode, activeWords = [], isBonus = false) {
    // Collect starting characters of all currently active falling words to prevent duplicates
    const activeStartChars = new Set(activeWords.map(w => w.text.charAt(0)));

    let pool = [];
    if (isBonus) {
      pool = WORDS_DATABASE.bonusWords;
    } else {
      switch (mode) {
        case 2:
          pool = WORDS_DATABASE.mode2;
          break;
        case 3:
          pool = WORDS_DATABASE.mode3;
          break;
        case 4:
          pool = WORDS_DATABASE.mode4;
          break;
        case 1:
        default:
          pool = WORDS_DATABASE.mode1;
          break;
      }
    }

    // Filter candidate words:
    // 1. Initial char must NOT collide with any active word's initial char
    // 2. Initial char must NOT be in red exclusion cooldown
    // 3. Word itself shouldn't already be active
    const activeTexts = new Set(activeWords.map(w => w.text));

    const candidates = pool.filter(w => {
      if (activeTexts.has(w)) return false;
      const initial = w.charAt(0);
      if (activeStartChars.has(initial)) return false;
      if (this.isCharExcluded(initial)) return false;
      return true;
    });

    if (candidates.length > 0) {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      if (isBonus) {
        this.activeRedInitialChar = chosen.charAt(0);
      }
      return chosen;
    }

    // Fallback: if pool is exhausted due to high screen density, pick any word not already on screen
    const backupCandidates = pool.filter(w => !activeTexts.has(w) && !this.isCharExcluded(w.charAt(0)));
    if (backupCandidates.length > 0) {
      const chosen = backupCandidates[Math.floor(Math.random() * backupCandidates.length)];
      if (isBonus) {
        this.activeRedInitialChar = chosen.charAt(0);
      }
      return chosen;
    }

    // Absolute fallback: pick random from pool
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Reset manager state
   */
  reset() {
    this.activeRedInitialChar = null;
    this.redCooldownChar = null;
    this.redCooldownUntil = 0;
  }
}

// Global instance
window.WordManager = new WordManager();
window.WORDS_DATABASE = WORDS_DATABASE;
