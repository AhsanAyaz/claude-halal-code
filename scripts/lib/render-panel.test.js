'use strict';
const assert = require('assert');

// Sample ayah fixture
const SAMPLE_AYAH = {
  arabic: 'اقْرَأْ بِاسْمِ رَبِّكَ',
  transliteration: "Iqra' bismi rabbika",
  translation: 'Read in the name of your Lord',
  surah_name: 'Al-Alaq',
  surah_number: 96,
  ayah_number: 1,
  themes: ['ilm'],
  time_slots: ['fajr']
};

// Load module under test
const { renderPanel } = require('./render-panel');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log('PASS: ' + description);
    passed++;
  } catch (err) {
    console.log('FAIL: ' + description + ' — ' + err.message);
    failed++;
  }
}

// Test 1: output contains box top-left corner (U+250C) — DISP-01
test('renderPanel() output contains U+250C (box top-left corner)', () => {
  const output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  assert.ok(typeof output === 'string', 'output should be a string');
  assert.ok(output.includes('\u250C'), 'output should contain ┌ (U+250C)');
});

// Test 2: output contains box horizontal (U+2500) — DISP-01
test('renderPanel() output contains U+2500 (box horizontal)', () => {
  const output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  assert.ok(output.includes('\u2500'), 'output should contain ─ (U+2500)');
});

// Test 3: output contains box vertical (U+2502) — DISP-01
test('renderPanel() output contains U+2502 (box vertical)', () => {
  const output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  assert.ok(output.includes('\u2502'), 'output should contain │ (U+2502)');
});

// Test 4: output does NOT contain Arabic text (removed for terminal compat) — DISP-06
test('renderPanel() output does not contain raw Arabic text', () => {
  const output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  const strippedOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
  // Arabic is omitted; transliteration serves as the phonetic representation
  assert.ok(!strippedOutput.includes(SAMPLE_AYAH.arabic), 'output should not contain Arabic script');
});

// Test 5: output contains ayah.transliteration as a substring — DISP-02
test('renderPanel() output contains ayah.transliteration', () => {
  const output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  assert.ok(output.includes(SAMPLE_AYAH.transliteration), 'output should contain transliteration');
});

// Test 6: output contains ayah.translation as a substring — DISP-02
test('renderPanel() output contains ayah.translation', () => {
  const output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  assert.ok(output.includes(SAMPLE_AYAH.translation), 'output should contain translation');
});

// Test 7: output contains ayah.surah_name as a substring — DISP-02
test('renderPanel() output contains ayah.surah_name', () => {
  const output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  assert.ok(output.includes(SAMPLE_AYAH.surah_name), 'output should contain surah name');
});

// Test 8: long translation wraps — full text visible, nothing cut off — DISP-02
test('renderPanel() long translation is fully visible (wraps, not truncated)', () => {
  const longAyah = Object.assign({}, SAMPLE_AYAH, {
    translation: 'My Lord! Inspire and bestow upon me the power and ability to be thankful for Your favours which You have bestowed upon me and upon my parents, and to do good deeds that please You'
  });
  const output = renderPanel(longAyah, { cols: 80 });
  const strippedOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(strippedOutput.includes('My Lord!'), 'output should contain start of long translation');
  assert.ok(strippedOutput.includes('my parents'), 'output should contain end of long translation (not truncated)');
});

// Test 9: cols < 40 → plain-text fallback (no box frame)
test('renderPanel() with cols=35 falls back to plain-text style', () => {
  const output = renderPanel(SAMPLE_AYAH, { cols: 35 });
  assert.ok(!output.includes('\u250C'), 'narrow output should not contain box frame');
  assert.ok(output.includes(SAMPLE_AYAH.transliteration), 'narrow output should still contain transliteration');
});

// Test 10: NO_COLOR=1 → output has no ANSI escape sequences — DISP-05
test('NO_COLOR=1: output contains no ANSI escape codes', () => {
  const savedNoColor = process.env.NO_COLOR;
  process.env.NO_COLOR = '1';
  let output;
  try {
    output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  } finally {
    if (savedNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = savedNoColor;
    }
  }
  const hasAnsi = /\x1b\[[0-9;]*m/.test(output);
  assert.ok(!hasAnsi, 'output with NO_COLOR=1 should have no ANSI escape codes');
});

// Test 11: without NO_COLOR → output contains at least one ANSI code (colors applied)
test('without NO_COLOR: output contains ANSI color codes', () => {
  const savedNoColor = process.env.NO_COLOR;
  delete process.env.NO_COLOR;
  let output;
  try {
    output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  } finally {
    if (savedNoColor !== undefined) {
      process.env.NO_COLOR = savedNoColor;
    }
  }
  const hasAnsi = /\x1b\[[0-9;]*m/.test(output);
  assert.ok(hasAnsi, 'output without NO_COLOR should contain ANSI color codes');
});

// Test 12: output contains quran.com link for the ayah — DISP-02
test('renderPanel() output contains quran.com link', () => {
  const output = renderPanel(SAMPLE_AYAH, { cols: 80 });
  const strippedAnsi = output.replace(/\x1b\[[0-9;]*m/g, '');
  const expectedUrl = 'https://quran.com/' + SAMPLE_AYAH.surah_number + '/' + SAMPLE_AYAH.ayah_number;
  assert.ok(strippedAnsi.includes(expectedUrl),
    'output should include quran.com URL for the ayah');
});

// Summary
console.log('');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed out of ' + (passed + failed) + ' tests');
process.exit(failed > 0 ? 1 : 0);
