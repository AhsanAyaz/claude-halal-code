'use strict';
/**
 * TDD tests for scripts/lib/select-ayah.js
 * Run: node scripts/lib/select-ayah.test.js
 */
const path = require('path');
const fs = require('fs');

// Try to require the module — may fail if not yet implemented
let selectAyah, resolveTheme;
try {
  ({ selectAyah, resolveTheme } = require('./select-ayah'));
} catch (_) {
  selectAyah = undefined;
  resolveTheme = undefined;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log('  PASS: ' + message);
    passed++;
  } else {
    console.error('  FAIL: ' + message);
    failed++;
  }
}

const pluginRoot = path.resolve(__dirname, '../..');

// ---- Test suite ----

console.log('Test: module exports');
assert(typeof resolveTheme === 'function', 'resolveTheme is a function');
assert(typeof selectAyah === 'function', 'selectAyah is a function');

if (typeof resolveTheme === 'function') {

  // THEME-01: tool-type → theme mapping
  console.log('\nTest: resolveTheme — known tool mappings (THEME-01)');
  assert(resolveTheme('Read') === 'ilm',      "resolveTheme('Read') === 'ilm'");
  assert(resolveTheme('Grep') === 'ilm',      "resolveTheme('Grep') === 'ilm'");
  assert(resolveTheme('Glob') === 'ilm',      "resolveTheme('Glob') === 'ilm'");
  assert(resolveTheme('LS') === 'ilm',        "resolveTheme('LS') === 'ilm'");
  assert(resolveTheme('Bash') === 'tawakkul', "resolveTheme('Bash') === 'tawakkul'");
  assert(resolveTheme('Write') === 'ihsan',   "resolveTheme('Write') === 'ihsan'");
  assert(resolveTheme('Edit') === 'ihsan',    "resolveTheme('Edit') === 'ihsan'");

  // THEME-01 unknown tool: falls back to time-of-day (not null)
  console.log('\nTest: resolveTheme — unknown/empty tool falls back to time-of-day (THEME-01)');
  const emptyResult = resolveTheme('');
  assert(typeof emptyResult === 'string' && emptyResult.length > 0,
    "resolveTheme('') returns a non-null non-empty string (time-of-day fallback)");
  const unknownResult = resolveTheme('UnknownTool');
  assert(typeof unknownResult === 'string' && unknownResult.length > 0,
    "resolveTheme('UnknownTool') returns a non-null non-empty string (time-of-day fallback)");

  // THEME-03: tool type overrides time-of-day
  console.log('\nTest: resolveTheme — known tool overrides time-of-day (THEME-03)');
  // This must hold regardless of what hour it currently is
  assert(resolveTheme('Write') === 'ihsan',
    "resolveTheme('Write') always returns 'ihsan' regardless of current hour");
  assert(resolveTheme('Read') === 'ilm',
    "resolveTheme('Read') always returns 'ilm' regardless of current hour");
  assert(resolveTheme('Bash') === 'tawakkul',
    "resolveTheme('Bash') always returns 'tawakkul' regardless of current hour");

}

if (typeof selectAyah === 'function') {

  // Integration with load-ayah: real pluginRoot returns a valid ayah
  console.log('\nTest: selectAyah — returns ayah object for real pluginRoot');
  const ayah = selectAyah('Read', '', pluginRoot);
  assert(ayah !== null, "selectAyah('Read', '', pluginRoot) returns non-null");
  if (ayah !== null) {
    assert(typeof ayah.arabic === 'string' && ayah.arabic.length > 0,
      'returned ayah has .arabic field');
    assert(typeof ayah.translation === 'string' && ayah.translation.length > 0,
      'returned ayah has .translation field');
    assert(typeof ayah.surah_name === 'string' && ayah.surah_name.length > 0,
      'returned ayah has .surah_name field');
  }

  // DATA-05 pattern: graceful null on bad pluginRoot
  console.log('\nTest: selectAyah — returns null for nonexistent pluginRoot (DATA-05)');
  const nullResult = selectAyah('Read', '', '/nonexistent/path/does/not/exist');
  assert(nullResult === null,
    "selectAyah with nonexistent pluginRoot returns null gracefully");

  // THEME-04: no-repeat within session
  console.log('\nTest: selectAyah — no-repeat within same session (THEME-04)');
  const SESSION_ID = 'test-session-001';
  // Clean up any leftover state file from previous runs
  const stateFile = path.join('/tmp/claude-code-quran-sessions', SESSION_ID + '.json');
  try { fs.unlinkSync(stateFile); } catch (_) { /* ignore if not present */ }

  // 'ilm' theme has 10 ayahs in fallback.json — pool is large enough for testing
  const first = selectAyah('Read', SESSION_ID, pluginRoot);
  const second = selectAyah('Read', SESSION_ID, pluginRoot);

  if (first !== null && second !== null) {
    const firstKey = first.surah_number + ':' + first.ayah_number;
    const secondKey = second.surah_number + ':' + second.ayah_number;
    assert(firstKey !== secondKey,
      'second call with same sessionId returns a different ayah (no-repeat THEME-04)');
  } else if (first !== null && second === null) {
    // Pool exhausted — this is also valid no-repeat behaviour
    assert(true, 'second call returned null (pool exhausted) — no-repeat satisfied');
  } else {
    assert(false, 'first call returned null unexpectedly — cannot test no-repeat');
  }

  // Teardown: remove state file to keep test runs idempotent
  try { fs.unlinkSync(stateFile); } catch (_) { /* ignore */ }

}

// ---- Summary ----
console.log('\n--- Results: ' + passed + ' passed, ' + failed + ' failed ---');
process.exit(failed > 0 ? 1 : 0);
