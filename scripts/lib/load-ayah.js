'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Load a random ayah from fallback.json for the given theme.
 * Returns null (never throws) if data is unavailable or theme has no matches.
 *
 * @param {string} pluginRoot - Absolute path to plugin root directory
 * @param {string} theme - Theme tag to filter by (e.g. 'ilm')
 * @returns {{ arabic, transliteration, translation, surah_name, surah_number, ayah_number } | null}
 */
function loadAyah(pluginRoot, theme) {
  try {
    const fallbackPath = path.join(pluginRoot, 'data', 'fallback.json');
    const data = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    const matching = (data.ayahs || []).filter(
      a => a.themes && a.themes.includes(theme)
    );
    if (matching.length === 0) return null;
    return matching[Math.floor(Math.random() * matching.length)];
  } catch (_) {
    return null;  // DATA-05: silent failure
  }
}

module.exports = { loadAyah };
