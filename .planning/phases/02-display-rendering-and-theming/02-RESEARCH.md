# Phase 2: Display Rendering and Theming - Research

**Researched:** 2026-03-15
**Domain:** Terminal ANSI rendering, Unicode box-drawing, chalk@4 CJS, Claude Code hook stdin parsing, rate limiting via temp file, thematic ayah selection
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mosque Art Style**
- Minimalist outline: dome shape + minaret silhouette — clean line-art, no ornamental detail
- Hand-crafted: multi-line string constants in code — no external library (figlet, art generators, etc.)
- Standard variant height: 5–7 lines tall
- Small variant (< ~60 cols): omit the mosque art entirely — degrade to text-only with the box frame still present

**Color Palette**
- Frame and mosque art: Islamic green (chalk `green` or `#2d6a4f` — Claude picks the exact shade that works on both dark and light terminals)
- Arabic text: plain white / default terminal color — no special tinting
- Transliteration line: dimmed (chalk `dim`)
- English translation: plain white / default
- Surah reference line (— Surah N:N): green, same as the frame — ties the reference visually to the frame
- NO_COLOR=1: all ANSI codes stripped, content preserved exactly (DISP-05)

**Panel Layout**
- Fixed width: 64 columns regardless of terminal width (above the narrow threshold)
- Text alignment: left-aligned inside the box, with 1-space padding on each side
- Art-to-text separator: one blank line between the mosque art block and the ayah text
- Content order inside box: mosque art → blank line → Arabic → transliteration → translation → reference
- Narrow threshold: below 60 cols, drop the mosque art; below a further threshold (Claude's discretion), fall back to Phase 1 plain-text style with no box

**PreToolUse Hook**
- Same full panel: PreToolUse displays the identical framed panel as SessionStart — no lighter variant
- Rate limiting: 60-second cooldown enforced via temp file (`/tmp/claude-code-quran-last-display`); PreToolUse skips display silently if within cooldown
- Session-boundary hooks exempt: SessionStart and Stop never suppressed (RATE-03)

**Thematic Selection**
- Tool type → theme mapping (THEME-01, tool type takes priority per THEME-03):
  - Read / Grep / Glob / LS → `ilm` (knowledge)
  - Bash → `tawakkul` (reliance/effort)
  - Write / Edit → `ihsan` (excellence)
  - Tool errors → `sabr` (patience)
  - Unknown / unrecognised tool types → fall back to time-of-day theme (not skipped, not defaulted to ilm)
- Time-of-day → theme (THEME-02, used when no tool-type signal or as fallback):
  - Pre-dawn/morning (Fajr, 4am–9am) → awakening/intention → `ilm` or `tawakkul`
  - Midday/afternoon (Dhuhr/Asr, 9am–5pm) → perseverance/effort → `tawakkul` or `ihsan`
  - Evening/night (Maghrib/Isha, 5pm–4am) → gratitude/reflection → `shukr` or `sabr`
- `shukr` theme surfaces via time-of-day only (evening/Maghrib-Isha window) — not mapped to any tool type
- No-repeat within session (THEME-04): track displayed ayah IDs in a session state file; implementation at Claude's discretion

**async:true confirmed to suppress systemMessage** — all hooks must be synchronous (no `async: true` field in hooks.json entries). Empirically validated in Phase 1 live testing.

**CommonJS only, chalk@4.1.2** (last CJS version).

### Claude's Discretion
- Exact chalk color value for "Islamic green" — pick what renders well on both dark and light terminals
- Specific mosque art character design for both variants (within the minimalist outline style and 5–7 line height constraint)
- Exact time-of-day boundary hours for Fajr/Dhuhr/Asr/Maghrib/Isha (approximate values given above are directional)
- Session no-repeat state file location and format
- Inner padding amount (1 space specified on left/right; top/bottom padding at Claude's discretion)
- Exact narrow fallback threshold (below 60 cols → no art is locked; further fallback to no-box is discretionary)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISP-01 | Display rendered as framed box using ANSI escape codes and Unicode box-drawing characters (no boxen) | Unicode box-drawing chars U+2500–U+257F; hand-rolled renderer using chalk@4 confirmed CJS compatible |
| DISP-02 | Box contains: ASCII mosque art, Arabic text, transliteration, Hilali-Khan translation, surah reference | Content order and chalk color assignments mapped; Arabic display-as-is confirmed |
| DISP-03 | At least 2 ASCII mosque art variants selected based on `process.stdout.columns` | Width detection via `process.stdout.columns || 80`; threshold locked at 60 cols for art omission |
| DISP-05 | Respects `NO_COLOR` environment variable | chalk@4 respects `NO_COLOR` via supports-color dependency; manual guard `if (process.env.NO_COLOR)` is belt-and-suspenders |
| DISP-06 | Arabic text displayed as-is (no RTL correction) | CONTEXT.md locked; terminal RTL is environment-dependent; plugin does not attempt correction |
| THEME-01 | Ayah theme based on tool type mapping | stdin `tool_name` field carries exact tool name; mapping table documented |
| THEME-02 | Ayah theme influenced by time of day | `new Date().getHours()` sufficient; time window boundaries defined |
| THEME-03 | Tool type takes priority over time-of-day theme | Selection logic: tool-type lookup first, fall back to time-of-day |
| THEME-04 | No repeat of same ayah within session | `session_id` available in stdin AND as `$CLAUDE_SESSION_ID` env var; state file keyed to session |
| RATE-01 | PreToolUse hook: 60-second cooldown between displays | Temp file `/tmp/claude-code-quran-last-display` stores `Date.now()` timestamp; sync read/write via `fs` |
| RATE-02 | Cooldown state in temp file | `fs.writeFileSync` / `fs.readFileSync` synchronous pattern; `parseInt` the stored epoch |
| RATE-03 | SessionStart and Stop hooks always display (no cooldown) | Rate-limit logic lives only in `scripts/pre-tool-use.js`, not in session-start.js |
| RATE-04 | PreCompact hook always displays (Phase 3 scope) | Out of Phase 2 scope — addressed in Phase 3 |
| HOOK-02 | PreToolUse hook registered in hooks.json | New `PreToolUse` array entry in `hooks/hooks.json`; matcher `""` (all tools); sync command |
</phase_requirements>

---

## Summary

Phase 2 delivers the full visual experience: a framed Unicode box panel with hand-crafted ASCII mosque art, chalk ANSI color, and thematically-selected ayahs driven by tool type and time of day. It also adds the PreToolUse hook with 60-second rate limiting.

The technical stack is entirely established from Phase 1: CommonJS, chalk@4.1.2, Node.js built-in `fs`, and the confirmed `systemMessage` JSON output pattern. No new runtime dependencies are needed. The rendering module (`scripts/lib/render-panel.js`) and selection module (`scripts/lib/select-ayah.js`) are the two primary new files, plus the hook entry script (`scripts/pre-tool-use.js`).

The single critical constraint is hook synchronicity: `async: true` in hooks.json was empirically confirmed in Phase 1 to suppress systemMessage rendering. All Phase 2 hooks must omit `async` entirely. The official docs contain inconsistency on this point — the empirical test result is the authoritative source for this project.

**Primary recommendation:** Build `render-panel.js` as a pure function (takes ayah + options, returns string), `select-ayah.js` as the theme-resolution layer wrapping `load-ayah.js`, and `pre-tool-use.js` as the thin entry point that reads stdin → selects theme → checks rate limit → renders → outputs systemMessage JSON.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chalk | 4.1.2 | ANSI color / dim / bold styling | Last CJS-compatible version; already installed in Phase 1; supports hex colors and NO_COLOR |
| Node.js `fs` | built-in | Sync file I/O for rate-limit temp file and session state file | No dependency; synchronous reads/writes block minimally for small files |
| Node.js `path` | built-in | Path construction (same pattern as Phase 1) | Already used in session-start.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| string-width | 4.x | Accurate Unicode character width (if needed for text truncation) | Only if Arabic text width measurement is needed for padding calculations — likely not needed since DISP-06 says display as-is |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled box renderer | boxen | boxen is ESM-only — incompatible with CJS requirement |
| chalk.green / chalk.hex | ansi-colors, kleur | chalk already installed; alternatives would add dependency for no gain |
| fs.readFileSync(0) for stdin | readline async | Synchronous is required; readline is async-only |

**Installation:** No new packages needed. chalk@4.1.2 is already present.

---

## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── session-start.js          # MODIFIED: replace formatAyah() with render-panel call
├── pre-tool-use.js           # NEW: PreToolUse entry point (reads stdin, rate limit, render)
└── lib/
    ├── load-ayah.js          # EXISTING: unchanged
    ├── select-ayah.js        # NEW: theme resolution (tool type + time-of-day → theme → ayah)
    └── render-panel.js       # NEW: box renderer, mosque art, color, NO_COLOR handling
hooks/
└── hooks.json                # MODIFIED: add PreToolUse entry
```

### Pattern 1: Synchronous stdin Reading (PreToolUse hook)
**What:** Read the full JSON payload from stdin synchronously before any processing.
**When to use:** Every PreToolUse hook entry point — stdin carries `tool_name` and `session_id`.
**Example:**
```javascript
// Source: Node.js built-in fs, fd 0 = stdin
'use strict';
const fs = require('fs');

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf-8'));
  } catch (_) {
    return {};
  }
}

const hookInput = readStdin();
const toolName = hookInput.tool_name || '';
const sessionId = hookInput.session_id || '';
```

### Pattern 2: Tool Name → Theme Mapping
**What:** Map `tool_name` from stdin to a theme string, fall back to time-of-day.
**When to use:** In `select-ayah.js` before calling `loadAyah()`.
**Example:**
```javascript
// Source: CONTEXT.md locked decisions, tool_name values confirmed from Claude Code docs
const TOOL_THEME_MAP = {
  'Read':  'ilm',
  'Grep':  'ilm',
  'Glob':  'ilm',
  'LS':    'ilm',
  'Bash':  'tawakkul',
  'Write': 'ihsan',
  'Edit':  'ihsan',
};

function resolveTheme(toolName) {
  if (TOOL_THEME_MAP[toolName]) return TOOL_THEME_MAP[toolName];
  return resolveTimeOfDayTheme();  // unknown tool falls back to time-of-day
}
```

### Pattern 3: Time-of-Day Theme Resolution
**What:** Map current hour to a theme string.
**When to use:** As fallback in `select-ayah.js` when no tool-type match.
```javascript
// Source: CONTEXT.md locked time windows; getHours() is local time
function resolveTimeOfDayTheme() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 9)  return 'ilm';      // Fajr → awakening/knowledge
  if (hour >= 9 && hour < 17) return 'tawakkul'; // Dhuhr/Asr → effort/perseverance
  return 'shukr';                                  // Maghrib/Isha → gratitude/reflection
  // Note: sabr available via time-of-day as secondary in evening window (Claude discretion)
}
```

### Pattern 4: Rate Limiting via Temp File
**What:** Read last-display epoch from temp file; skip display if within 60 seconds; write new epoch after display.
**When to use:** In `pre-tool-use.js` only — NOT in session-start.js (RATE-03).
```javascript
// Source: Node.js fs built-in; CONTEXT.md locked temp file path
const RATE_FILE = '/tmp/claude-code-quran-last-display';
const COOLDOWN_MS = 60 * 1000;

function isWithinCooldown() {
  try {
    const last = parseInt(fs.readFileSync(RATE_FILE, 'utf-8').trim(), 10);
    return (Date.now() - last) < COOLDOWN_MS;
  } catch (_) {
    return false;  // no file = never displayed = not within cooldown
  }
}

function stampCooldown() {
  try {
    fs.writeFileSync(RATE_FILE, String(Date.now()), 'utf-8');
  } catch (_) {}  // DATA-05: silent failure
}
```

### Pattern 5: Unicode Box Renderer
**What:** Build a framed box string from content lines.
**When to use:** In `render-panel.js` as the primary rendering function.
```javascript
// Source: Unicode Standard U+2500–U+257F box-drawing block
// Light box characters:
//   ┌ U+250C  top-left corner
//   ─ U+2500  horizontal
//   ┐ U+2510  top-right corner
//   │ U+2502  vertical
//   └ U+2514  bottom-left corner
//   ┘ U+2518  bottom-right corner

const BOX = {
  tl: '\u250C', tr: '\u2510',
  bl: '\u2514', br: '\u2518',
  h:  '\u2500', v:  '\u2502',
};

function buildBox(lines, width, chalkGreen, chalkDim) {
  const inner = width - 2;  // subtract left + right border chars
  const top    = chalkGreen(BOX.tl + BOX.h.repeat(inner) + BOX.tr);
  const bottom = chalkGreen(BOX.bl + BOX.h.repeat(inner) + BOX.br);
  const padded = lines.map(line => {
    const pad = ' ' + line + ' ';
    return chalkGreen(BOX.v) + pad + chalkGreen(BOX.v);
  });
  return [top, ...padded, bottom].join('\n');
}
```

### Pattern 6: NO_COLOR Handling
**What:** Detect NO_COLOR and disable chalk output.
**When to use:** At the top of `render-panel.js`, before any chalk calls.

chalk@4 uses the `supports-color` package internally, which checks `NO_COLOR`. However, empirical behavior can vary across environments. The belt-and-suspenders approach is to construct a no-op chalk instance when `NO_COLOR` is set.

```javascript
// Source: chalk@4 README + NO_COLOR spec (no-color.org)
const chalk = require('chalk');

// chalk@4 auto-detects NO_COLOR via supports-color; this guard is belt-and-suspenders
const chalkInstance = process.env.NO_COLOR
  ? new chalk.Instance({ level: 0 })
  : chalk;
```

### Pattern 7: Session No-Repeat State File
**What:** Track displayed ayah IDs per session to prevent repeats within a session.
**When to use:** In `select-ayah.js`, after theme resolution, before returning ayah.

`session_id` is available in:
1. The stdin JSON payload as `session_id` field (all hook events)
2. The `CLAUDE_SESSION_ID` environment variable (Claude Code v2.1.9+)

SessionStart does NOT receive stdin JSON — it uses `CLAUDE_SESSION_ID` env var only.

```javascript
// Source: Claude Code docs (session_id in all hook stdin + CLAUDE_SESSION_ID env var)
const SESSION_STATE_DIR = '/tmp/claude-code-quran-sessions';

function getDisplayedIds(sessionId) {
  try {
    const file = path.join(SESSION_STATE_DIR, sessionId + '.json');
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (_) {
    return [];
  }
}

function saveDisplayedId(sessionId, ayahKey) {
  try {
    if (!fs.existsSync(SESSION_STATE_DIR)) {
      fs.mkdirSync(SESSION_STATE_DIR, { recursive: true });
    }
    const file = path.join(SESSION_STATE_DIR, sessionId + '.json');
    const ids = getDisplayedIds(sessionId);
    if (!ids.includes(ayahKey)) ids.push(ayahKey);
    fs.writeFileSync(file, JSON.stringify(ids), 'utf-8');
  } catch (_) {}  // DATA-05: silent failure
}

// ayahKey = surah_number + ':' + ayah_number  (e.g. "96:1")
```

### Anti-Patterns to Avoid
- **`async: true` in hooks.json:** Empirically confirmed to suppress systemMessage rendering. Never add this field to Phase 2 hook entries.
- **`console.log()` in hook scripts:** Pollutes stdout and corrupts the JSON output channel. Always use `process.stdout.write(JSON.stringify({...}))`.
- **Dynamic `require('chalk')` inside render function:** Import chalk once at module top level; avoid re-importing on every render call.
- **Using `process.stdout.columns` without fallback:** Returns `undefined` when stdout is not a TTY (e.g., piped output). Always use `process.stdout.columns || 80`.
- **String length for Arabic text:** `String.length` counts UTF-16 code units, not visual characters. For Arabic display-as-is (DISP-06), this is acceptable — we are not padding or truncating Arabic lines, just displaying them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ANSI color output | Custom ANSI escape string builder | chalk@4 | chalk handles level detection, NO_COLOR, and 256/truecolor correctly |
| Unicode box border strings | Custom character tables | Hard-code the 6 Unicode box chars directly (`\u250C` etc.) | The set needed is tiny; no library needed |
| RTL Arabic shaping | Arabic text reorder/reshape | None — display as-is per DISP-06 | Terminal RTL support is environment-dependent; plugin intentionally skips correction |
| Temp file atomicity | Write-then-rename for rate limit file | Plain `fs.writeFileSync` | Rate limit file is single small integer; data loss on crash is harmless (just allows one extra display) |

---

## Common Pitfalls

### Pitfall 1: `async: true` silences systemMessage
**What goes wrong:** Adding `async: true` to a hooks.json entry causes Claude Code to discard the systemMessage from stdout, so nothing is displayed.
**Why it happens:** Async hooks run in background after the tool call completes; output handling differs from sync hooks.
**How to avoid:** Never add `async: true` to any hook entry in this plugin. All hooks must be synchronous.
**Warning signs:** Hook runs (no error), but nothing appears in the terminal. Test with a simple `{"systemMessage": "test"}` script.

### Pitfall 2: `process.stdout.columns` is undefined in non-TTY contexts
**What goes wrong:** `process.stdout.columns` returns `undefined` when stdout is piped or redirected; arithmetic on it produces `NaN`.
**Why it happens:** `columns` is only set when stdout is a TTY.
**How to avoid:** Always guard: `const cols = process.stdout.columns || 80;`
**Warning signs:** Box width renders as `NaN` characters; nothing appears.

### Pitfall 3: chalk@4 color level detection fails in hook context
**What goes wrong:** chalk detects color level 0 (no colors) because the hook process stdout is not a TTY.
**Why it happens:** Hook scripts pipe their stdout to Claude Code process (not a real terminal), so `supports-color` returns level 0.
**How to avoid:** Force chalk level via `new chalk.Instance({ level: 3 })` OR rely on `FORCE_COLOR=1` being set by the user. As a pragmatic default, use `chalk.Instance({ level: process.env.NO_COLOR ? 0 : 3 })` — force colors unless NO_COLOR is set.
**Warning signs:** All output is plain text even without `NO_COLOR` set. Seen when testing by piping output to `| cat`.

### Pitfall 4: SessionStart has no stdin JSON
**What goes wrong:** Calling `fs.readFileSync(0, 'utf-8')` in `session-start.js` blocks forever because SessionStart does not pipe JSON to stdin.
**Why it happens:** SessionStart has no `tool_name` to provide; the stdin input model only applies to tool-event hooks.
**How to avoid:** Only read stdin in `pre-tool-use.js`. For `session-start.js`, get session_id from `process.env.CLAUDE_SESSION_ID` (v2.1.9+), or omit session tracking if env var is unavailable.
**Warning signs:** session-start.js hangs indefinitely; Claude Code session appears to freeze on startup.

### Pitfall 5: `CLAUDE_SESSION_ID` env var may be absent in older Claude Code versions
**What goes wrong:** `process.env.CLAUDE_SESSION_ID` is undefined; session state file cannot be keyed to a session.
**Why it happens:** Feature was added in Claude Code v2.1.9 — older installs lack it.
**How to avoid:** Graceful fallback: if `CLAUDE_SESSION_ID` is falsy, skip no-repeat tracking (random selection still works, just may repeat).
**Warning signs:** Session state file created with `undefined` as filename part.

### Pitfall 6: Rate limit temp file permissions on /tmp
**What goes wrong:** `/tmp/claude-code-quran-last-display` cannot be written due to permissions (unlikely but possible on hardened systems).
**Why it happens:** Some systems restrict `/tmp` writes for non-root processes.
**How to avoid:** Wrap all rate-limit file operations in try/catch; on write failure, treat as "not in cooldown" (fail open — extra display is harmless).
**Warning signs:** Every PreToolUse call displays an ayah regardless of timing.

### Pitfall 7: chalk color on light vs dark terminals
**What goes wrong:** `chalk.green` (bright green, #00ff00) looks fine on dark terminals but is near-invisible on white backgrounds.
**Why it happens:** chalk's named `green` maps to ANSI green which is typically bright/saturated.
**How to avoid:** Use `chalk.hex('#2d6a4f')` — a forest green that has adequate contrast on both dark (#2d6a4f on black = readable) and light (#2d6a4f on white = readable) terminals. This is darker/more muted than ANSI green.
**Warning signs:** Tester reports invisible frame on light terminal.

---

## Code Examples

### Full render-panel.js structure (skeleton)
```javascript
// Source: synthesized from chalk@4 docs + Unicode box-drawing standard
'use strict';
const chalk = require('chalk');

const BOX_WIDTH = 64;
const NARROW_NO_ART = 60;   // below this: omit mosque art
const NARROW_NO_BOX = 40;   // below this: fall back to plain text (Claude's discretion)

// Force colors on (unless NO_COLOR), since hook stdout is not a TTY
const c = new chalk.Instance({ level: process.env.NO_COLOR ? 0 : 3 });
const green = (s) => c.hex('#2d6a4f')(s);
const dim   = (s) => c.dim(s);

const BOX_CHARS = { tl:'\u250C', tr:'\u2510', bl:'\u2514', br:'\u2518', h:'\u2500', v:'\u2502' };

const MOSQUE_ART_STANDARD = [
  '      |    |    |      ',
  '     _|_  _|_  _|_     ',
  '    /   \\/   \\/   \\   ',
  '   |  ( )  ( )  ( )  | ',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~',
].map(line => green(line));

// renderPanel(ayah, opts) → string
// opts: { cols: number }
function renderPanel(ayah, opts) { /* ... */ }

module.exports = { renderPanel };
```

### pre-tool-use.js entry point structure
```javascript
'use strict';
const fs = require('fs');

function main() {
  // 1. Read stdin (carries tool_name and session_id)
  let hookInput = {};
  try { hookInput = JSON.parse(fs.readFileSync(0, 'utf-8')); } catch (_) {}

  const toolName  = hookInput.tool_name  || '';
  const sessionId = hookInput.session_id || process.env.CLAUDE_SESSION_ID || '';

  // 2. Check rate limit
  if (isWithinCooldown()) {
    process.stdout.write(JSON.stringify({ systemMessage: '' }));
    process.exit(0);
  }

  // 3. Select theme + ayah
  const pluginRoot = resolvePluginRoot();
  const ayah = selectAyah(pluginRoot, toolName, sessionId);
  if (!ayah) {
    process.stdout.write(JSON.stringify({ systemMessage: '' }));
    process.exit(0);
  }

  // 4. Render panel
  const { renderPanel } = require('./lib/render-panel');
  const displayText = renderPanel(ayah, { cols: process.stdout.columns || 80 });

  // 5. Stamp cooldown + output
  stampCooldown();
  process.stdout.write(JSON.stringify({ systemMessage: displayText }));
  process.exit(0);
}

try { main(); } catch (_) {
  process.stdout.write(JSON.stringify({ systemMessage: '' }));
  process.exit(0);
}
```

### hooks.json PreToolUse entry
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/session-start.js"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/pre-tool-use.js"
          }
        ]
      }
    ]
  }
}
```
Note: `matcher: ""` matches all tool types, which is correct — the theme selection logic inside the script handles per-tool dispatch.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| boxen for terminal boxes | hand-rolled Unicode box renderer | boxen moved to ESM-only in v7 (2022) | Must build own renderer; straightforward with 6 chars |
| chalk@5 | chalk@4.1.2 (CJS) | chalk@5 dropped CJS in 2021 | Locked to 4.x; no API difference for use cases here |
| `/dev/tty` for hook display | `systemMessage` JSON on stdout | Empirically resolved Phase 1 | stdout JSON is the only working channel |
| `async: true` hooks | sync hooks (no async field) | Empirically resolved Phase 1 | async suppresses systemMessage |

**Deprecated/outdated:**
- `process.stdout.write` to `/dev/tty`: does not work reliably for Claude Code hook display
- `console.log()` in hook scripts: corrupts JSON output channel

---

## Open Questions

1. **chalk color level in hook context**
   - What we know: Hook stdout is piped (not TTY), so `supports-color` returns level 0 by default
   - What's unclear: Whether Claude Code sets `FORCE_COLOR` itself, or whether users typically have it set
   - Recommendation: Use `new chalk.Instance({ level: process.env.NO_COLOR ? 0 : 3 })` — force level 3 unless NO_COLOR is set. This is safe; truecolor is universally supported in modern terminals (macOS Terminal, iTerm2, VS Code terminal).

2. **SessionStart no-repeat tracking without stdin**
   - What we know: SessionStart has no stdin JSON; `CLAUDE_SESSION_ID` env var available in v2.1.9+
   - What's unclear: Version of Claude Code installed in user's environment
   - Recommendation: Use `process.env.CLAUDE_SESSION_ID || null`; if null, skip session-scoped no-repeat for SessionStart (random selection still works without repeating within the same theme pool).

3. **PreToolUse matcher for "all tools" — empty string vs absent**
   - What we know: Docs say omitting matcher, using `"*"`, or using `""` all match all tools
   - What's unclear: Whether `matcher: ""` is treated as no-match vs all-match in all Claude Code versions
   - Recommendation: Use `"matcher": ""` (empty string) as seen in the official docs example. If that fails in testing, remove the `matcher` key entirely.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (no framework — hand-written assert pattern, matching Phase 1 style) |
| Config file | none — tests run directly with `node scripts/lib/render-panel.test.js` |
| Quick run command | `node scripts/lib/render-panel.test.js && node scripts/lib/select-ayah.test.js` |
| Full suite command | `node scripts/lib/load-ayah.test.js && node scripts/lib/render-panel.test.js && node scripts/lib/select-ayah.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01 | Box output contains Unicode box chars (┌, ─, ┐, │, └, ┘) | unit | `node scripts/lib/render-panel.test.js` | ❌ Wave 0 |
| DISP-02 | renderPanel output contains arabic, transliteration, translation, reference | unit | `node scripts/lib/render-panel.test.js` | ❌ Wave 0 |
| DISP-03 | Width < 60 → no mosque art in output; width >= 60 → art present | unit | `node scripts/lib/render-panel.test.js` | ❌ Wave 0 |
| DISP-05 | NO_COLOR=1 strips ANSI codes; text content preserved | unit | `NO_COLOR=1 node scripts/lib/render-panel.test.js` | ❌ Wave 0 |
| DISP-06 | Arabic text appears in output as-is (no transformation) | unit | `node scripts/lib/render-panel.test.js` | ❌ Wave 0 |
| THEME-01 | tool_name "Read" → theme "ilm"; "Bash" → "tawakkul"; "Write" → "ihsan" | unit | `node scripts/lib/select-ayah.test.js` | ❌ Wave 0 |
| THEME-02 | Hour 6 → "ilm"; Hour 12 → "tawakkul"; Hour 20 → "shukr" | unit | `node scripts/lib/select-ayah.test.js` | ❌ Wave 0 |
| THEME-03 | Known tool_name takes priority over time-of-day | unit | `node scripts/lib/select-ayah.test.js` | ❌ Wave 0 |
| THEME-04 | Same ayah ID not returned twice for same session | unit | `node scripts/lib/select-ayah.test.js` | ❌ Wave 0 |
| RATE-01 | Second call within 60s returns cooldown=true | unit | `node scripts/pre-tool-use.test.js` | ❌ Wave 0 |
| RATE-02 | Temp file written with epoch after display | unit | `node scripts/pre-tool-use.test.js` | ❌ Wave 0 |
| RATE-03 | session-start.js does NOT call rate-limit check | unit | manual inspection / `grep -c "isWithinCooldown" scripts/session-start.js` = 0 | ❌ Wave 0 |
| HOOK-02 | hooks.json contains PreToolUse entry with correct command | unit | `node -e "const h=require('./hooks/hooks.json'); process.exit(h.hooks.PreToolUse ? 0 : 1)"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node scripts/lib/render-panel.test.js && node scripts/lib/select-ayah.test.js`
- **Per wave merge:** `node scripts/lib/load-ayah.test.js && node scripts/lib/render-panel.test.js && node scripts/lib/select-ayah.test.js && node scripts/pre-tool-use.test.js`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/lib/render-panel.test.js` — covers DISP-01, DISP-02, DISP-03, DISP-05, DISP-06
- [ ] `scripts/lib/select-ayah.test.js` — covers THEME-01, THEME-02, THEME-03, THEME-04
- [ ] `scripts/pre-tool-use.test.js` — covers RATE-01, RATE-02, RATE-03 (partial)
- [ ] `scripts/lib/render-panel.js` — the module under test
- [ ] `scripts/lib/select-ayah.js` — the module under test
- [ ] `scripts/pre-tool-use.js` — the hook entry script

---

## Sources

### Primary (HIGH confidence)
- Claude Code Hooks official docs (`https://code.claude.com/docs/en/hooks`) — PreToolUse stdin format, tool_name values, matcher behavior, systemMessage field
- Phase 1 empirical test results (STATE.md, CONTEXT.md) — async:true suppresses systemMessage; sync execution confirmed; systemMessage JSON on stdout is sole working channel
- Unicode Standard U+2500–U+257F box-drawing block — box character codepoints
- NO_COLOR specification (`https://no-color.org/`) — standard behavior: strip ANSI when env var present and non-empty

### Secondary (MEDIUM confidence)
- chalk npm package page (`https://www.npmjs.com/package/chalk`) — chalk@4 API; supports-color integration; hex() method; NO_COLOR handled via supports-color
- Claude Code GitHub issue #33263 and #32954 — async hook completion messages and silent option (confirms async hooks have different output handling)
- Claude Code docs re: `CLAUDE_SESSION_ID` env var available in v2.1.9+ — session_id sourcing for state file

### Tertiary (LOW confidence)
- Various WebSearch results on Node.js sync stdin reading — `fs.readFileSync(0, 'utf-8')` pattern widely cited but not in official Node.js docs as the primary recommendation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — chalk@4 already installed and tested; no new dependencies
- Architecture: HIGH — patterns derived directly from Phase 1 code and locked CONTEXT.md decisions
- Hook stdin format: HIGH — verified from official Claude Code docs
- Pitfalls: HIGH — async:true behavior from empirical Phase 1 test; chalk non-TTY level from known chalk behavior
- Validation architecture: HIGH — follows Phase 1 test pattern exactly

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (chalk@4 and Claude Code hook format are stable; hook stdin format changes would require Claude Code major version)
