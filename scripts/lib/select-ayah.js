'use strict';
const fs = require('fs');
const path = require('path');

// Keep load-ayah require for compatibility / future use
// eslint-disable-next-line no-unused-vars
const { loadAyah } = require('./load-ayah');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_STATE_DIR = '/tmp/claude-code-quran-sessions';

/**
 * Tool-type → theme mapping (THEME-01).
 * Case-sensitive per Claude Code docs — tool names arrive exactly as shown here.
 */
const TOOL_THEME_MAP = {
  'Read':  'ilm',
  'Grep':  'ilm',
  'Glob':  'ilm',
  'LS':    'ilm',
  'Bash':  'tawakkul',
  'Write': 'ihsan',
  'Edit':  'ihsan',
  // 'error': 'sabr',  // reserved for Phase 3 PostToolUse handler
};

// ---------------------------------------------------------------------------
// resolveTimeOfDayTheme (THEME-02)
// ---------------------------------------------------------------------------

/**
 * Returns a theme based on the current local hour.
 *  4–8:  'ilm'       (Fajr / awakening / knowledge)
 *  9–16: 'tawakkul'  (Dhuhr/Asr / effort / perseverance)
 * 17–3:  'shukr'     (Maghrib/Isha / gratitude / reflection)
 */
function resolveTimeOfDayTheme() {
  const h = new Date().getHours();
  if (h >= 4 && h < 9)  return 'ilm';
  if (h >= 9 && h < 17) return 'tawakkul';
  return 'shukr';
}

// ---------------------------------------------------------------------------
// resolveTheme (THEME-01, THEME-03)
// ---------------------------------------------------------------------------

/**
 * Resolve tool name to a theme string.
 * Known tools: exact TOOL_THEME_MAP lookup.
 * Unknown or empty tool: falls back to time-of-day.
 * NEVER returns null — always returns a theme string.
 *
 * @param {string} toolName
 * @returns {string} theme
 */
function resolveTheme(toolName) {
  if (toolName && Object.prototype.hasOwnProperty.call(TOOL_THEME_MAP, toolName)) {
    return TOOL_THEME_MAP[toolName];
  }
  return resolveTimeOfDayTheme();
}

// ---------------------------------------------------------------------------
// No-repeat session state helpers (THEME-04)
// ---------------------------------------------------------------------------

/**
 * Read the list of already-displayed ayah keys for a session.
 * Returns [] on any error (DATA-05 silent failure).
 *
 * @param {string} sessionId
 * @returns {string[]} e.g. ['96:1', '2:31']
 */
function getDisplayedIds(sessionId) {
  try {
    const file = path.join(SESSION_STATE_DIR, sessionId + '.json');
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/**
 * Append an ayah key to the session's displayed list.
 * Silent failure on any I/O error (DATA-05).
 *
 * @param {string} sessionId
 * @param {string} ayahKey  e.g. '96:1'
 */
function saveDisplayedId(sessionId, ayahKey) {
  try {
    fs.mkdirSync(SESSION_STATE_DIR, { recursive: true });
    const file = path.join(SESSION_STATE_DIR, sessionId + '.json');
    const existing = getDisplayedIds(sessionId);
    if (!existing.includes(ayahKey)) {
      existing.push(ayahKey);
    }
    fs.writeFileSync(file, JSON.stringify(existing), 'utf8');
  } catch (_) {
    // DATA-05: silent failure — never crash the hook
  }
}

// ---------------------------------------------------------------------------
// loadAyahsForTheme — direct pool access for no-repeat selection
// ---------------------------------------------------------------------------

/**
 * Load all ayahs matching a theme from fallback.json.
 * Returns [] on any error.
 *
 * @param {string} pluginRoot
 * @param {string} theme
 * @returns {object[]}
 */
function loadAyahsForTheme(pluginRoot, theme) {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(pluginRoot, 'data', 'fallback.json'), 'utf8')
    );
    return (data.ayahs || []).filter(a => a.themes && a.themes.includes(theme));
  } catch (_) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// selectAyah — main public API
// ---------------------------------------------------------------------------

/**
 * Select a non-repeated ayah for the current session.
 *
 * 1. Resolve theme from toolName (or time-of-day).
 * 2. Load all ayahs for that theme.
 * 3. Exclude already-displayed ones (when sessionId is provided).
 * 4. If pool exhausted, reset and pick from full theme pool.
 * 5. Save selected ayah key to session state.
 * 6. Return ayah object, or null if data unavailable (DATA-05).
 *
 * @param {string} toolName   - tool name from hook_input (e.g. 'Read') or '' for SessionStart
 * @param {string} sessionId  - from CLAUDE_SESSION_ID or '' if unavailable
 * @param {string} pluginRoot - absolute path to plugin root
 * @returns {object|null}
 */
function selectAyah(toolName, sessionId, pluginRoot) {
  try {
    const theme = resolveTheme(toolName);

    const allAyahs = loadAyahsForTheme(pluginRoot, theme);
    if (allAyahs.length === 0) return null;

    const displayedIds = sessionId ? getDisplayedIds(sessionId) : [];

    // Filter out already-displayed ayahs
    let pool = allAyahs.filter(a => {
      const key = a.surah_number + ':' + a.ayah_number;
      return !displayedIds.includes(key);
    });

    // If pool is exhausted, reset and use the full set
    if (pool.length === 0) {
      pool = allAyahs;
    }

    const ayah = pool[Math.floor(Math.random() * pool.length)];

    if (sessionId) {
      const ayahKey = ayah.surah_number + ':' + ayah.ayah_number;
      saveDisplayedId(sessionId, ayahKey);
    }

    return ayah;
  } catch (_) {
    return null;  // DATA-05: zero-crash guarantee
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { selectAyah, resolveTheme };
