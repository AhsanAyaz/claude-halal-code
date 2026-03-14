# Phase 1: Foundation and Hook Scaffold - Research

**Researched:** 2026-03-14
**Domain:** Claude Code Plugin System — manifest, hooks, output mechanisms, Node.js scripts
**Confidence:** HIGH (official docs + multiple verified GitHub issues)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Output Mechanism**
- Strategy: test first — before writing any real Phase 1 display code, create a minimal test hook that tries all four output mechanisms so the blocking question is empirically answered
- Test all four: `process.stderr`, `process.stdout`, `/dev/tty` (via `fs.writeFileSync`), and `systemMessage` (if available)
- Test reporting: each mechanism writes a visually labeled line (e.g. `[stderr] visible?`, `[tty] visible?`) so results are immediately readable without opening a file
- Production choice: researcher/Claude selects the most standard mechanism that confirmed as visible — no pre-decision here, let the test evidence decide

**Phase 1 Display Format**
- Minimal plain text — no Unicode box-drawing, no colors, no ASCII mosque art (those are Phase 2)
- Content order: Arabic text → Transliteration → English translation → Reference (mirrors Mushaf reading order)
- Arabic handling: display Arabic as-is unconditionally; transliteration line immediately below acts as readable fallback
- Separator: blank line + `------` dashes before and after the block

**Fallback Ayah Dataset**
- Curation: Claude suggests ~50 well-known ayahs, user reviews before Phase 1 ships
- Distribution: equal — 10 ayahs per theme: `ilm`, `tawakkul`, `ihsan`, `sabr`, `shukr`
- Time-of-day tags: include now (fajr, duha, asr, maghrib, isha) even though selection logic runs in Phase 2
- No specific surah preferences — Claude picks from widely recognized ayahs across themes
- Selection format for Phase 1: random pick from the `ilm` theme (no tool-type routing until Phase 2)

**Package Structure**
- Zero dependencies in Phase 1 — only Node.js built-ins: `fs`, `path`, `process`
- No package.json in Phase 1
- Plugin at repo root — `plugin.json` at `.claude-plugin/plugin.json`, `scripts/` and `data/` directories alongside it
- Installation: git clone + `--plugin-dir` flag pointing to clone directory; `$CLAUDE_PLUGIN_ROOT` resolves to wherever they cloned

### Claude's Discretion

- Which specific ayahs Claude selects for the bundled fallback (subject to user review)
- Which output mechanism to use in production hooks after seeing test results
- Exact fallback.json field names and JSON structure (as long as it satisfies DATA-02 fields)
- How to handle `/dev/tty` gracefully if the environment doesn't support it in the test hook

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Valid `.claude-plugin/plugin.json` manifest with name `claude-code-quran` | Plugin manifest schema confirmed from official docs; `name` is the only required field |
| INFRA-02 | All intra-plugin path references use `$CLAUDE_PLUGIN_ROOT` | CRITICAL BUG: `${CLAUDE_PLUGIN_ROOT}` is NOT set during SessionStart hooks (issue #27145). Workaround required. See Architecture Patterns. |
| INFRA-03 | Hook scripts invoked as `node ${CLAUDE_PLUGIN_ROOT}/scripts/...` | Same CLAUDE_PLUGIN_ROOT bug applies; test hook must use workaround strategy |
| INFRA-04 | All display hooks use `async: true` | `"async": true` confirmed in official docs; prevents blocking Claude's tool execution |
| DATA-01 | Bundled `data/fallback.json` with ~50 ayahs tagged by theme and time-of-day | JSON file in `data/` directory; loaded via `fs.readFileSync` with `__dirname` resolution |
| DATA-02 | Each ayah: Arabic, transliteration, Hilali-Khan English, surah name, surah number, ayah number | Pure data structure; no external dependencies needed |
| DATA-05 | Fallback to bundled `fallback.json` silently if API unavailable | Phase 1 only uses fallback.json; no API in this phase — silent operation is the default |
| DISP-04 | Display output goes to stderr (shown immediately in terminal) | CRITICAL FINDING: stderr is swallowed for SessionStart hooks. `systemMessage` is the confirmed working mechanism in CLI. Output mechanism test hook needed first. |
| HOOK-01 | SessionStart hook displays opening ayah and triggers background cache refresh | SessionStart hook fires; output via `systemMessage` JSON response is confirmed working in CLI. CLAUDE_PLUGIN_ROOT workaround required. |
</phase_requirements>

---

## Summary

Claude Code's plugin system uses a `.claude-plugin/plugin.json` manifest at the plugin root, with hooks defined in `hooks/hooks.json`. The system is well-documented, but there are two open bugs that directly block this phase if not handled: `${CLAUDE_PLUGIN_ROOT}` is not populated during `SessionStart` hooks (GitHub issue #27145, tracked as duplicate of #24529, unresolved as of March 2026), and `process.stderr`/`/dev/tty` output from hooks with exit code 0 is intentionally suppressed by Claude Code — the correct output channel for user-visible messages from hook scripts is the `systemMessage` JSON field returned on stdout.

The test-first approach in CONTEXT.md is well-founded but the research has pre-answered the critical question: in CLI Claude Code, `systemMessage` output from a SessionStart hook displays as `SessionStart:startup says: [message]` in the terminal. `process.stderr` is silently suppressed (this is intentional design, confirmed closed as NOT PLANNED in issue #12653). `/dev/tty` writes also fail because hooks run in a sandboxed environment without direct terminal access. The test hook should still be built to empirically confirm the user's specific environment, but the plan can proceed with `systemMessage` as the production mechanism.

For the CLAUDE_PLUGIN_ROOT bug: when the plugin is loaded via `--plugin-dir ./claude-halal-code`, Claude Code loads in-place without caching. The workaround is to read `CLAUDE_PLUGIN_ROOT` first and fall back to parsing `~/.claude/plugins/installed_plugins.json` when the variable is empty. For the SessionStart hook specifically, the hook command in `hooks.json` cannot use `${CLAUDE_PLUGIN_ROOT}` — it must use an alternative path resolution strategy (e.g., the hook reads its own location from `installed_plugins.json`, or the user's setup script writes an absolute path into `hooks.json` during installation).

**Primary recommendation:** Use `systemMessage` as the output mechanism for SessionStart display. Use a Node.js bootstrap resolver pattern to locate the plugin root when `CLAUDE_PLUGIN_ROOT` is empty. Structure hooks.json with a SessionStart hook that invokes a Node script via absolute path established at install time, or reads the plugin path from `installed_plugins.json` at runtime.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | Node 18+ | `fs`, `path`, `process`, `child_process` | Zero-dependency requirement; always present on dev machines |

### Supporting

None — Phase 1 is deliberately zero-dependency.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zero deps | chalk@4.x | chalk adds color (Phase 2 need); avoid creating package.json that implies unmet deps |
| `__dirname` (CJS) | `import.meta.url` (ESM) | State.md confirmed CommonJS (`require()`); chalk@4 last CJS version; ESM adds complexity |

**Installation:**

```bash
# No npm install needed — zero dependencies in Phase 1
git clone <repo> claude-halal-code
claude --plugin-dir ./claude-halal-code
```

---

## Architecture Patterns

### Recommended Project Structure

```
claude-halal-code/                  # repo root IS the plugin root
├── .claude-plugin/
│   └── plugin.json                 # INFRA-01: manifest with name, version, description
├── hooks/
│   └── hooks.json                  # hook event definitions
├── scripts/
│   ├── test-output-mechanisms.js   # one-time test hook (empirical output test)
│   ├── session-start.js            # HOOK-01: SessionStart display script
│   └── lib/
│       ├── load-ayah.js            # DATA-01/DATA-02: reads fallback.json, selects ayah
│       └── format-display.js       # DISP-04: formats plain-text output block
├── data/
│   └── fallback.json               # DATA-01/DATA-02: 50 curated ayahs
└── README.md
```

### Pattern 1: Plugin Manifest

**What:** `.claude-plugin/plugin.json` is the required manifest. `name` is the only required field. All other directories (hooks/, scripts/, data/) go at the plugin root, NOT inside `.claude-plugin/`.

**When to use:** Always — Claude Code discovers components via this manifest.

```json
// Source: https://code.claude.com/docs/en/plugins-reference
// .claude-plugin/plugin.json
{
  "name": "claude-code-quran",
  "version": "1.0.0",
  "description": "Displays Quranic ayahs during Claude Code sessions"
}
```

### Pattern 2: hooks.json Format

**What:** `hooks/hooks.json` defines event handlers with matchers and commands.

**CRITICAL NOTE on SessionStart:** `${CLAUDE_PLUGIN_ROOT}` is empty during SessionStart hook execution (issue #27145, unresolved). The hook command must use an absolute path OR the script must resolve its own location internally.

```json
// Source: https://code.claude.com/docs/en/hooks + issue #27145 workaround
// hooks/hooks.json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/session-start.js",
            "async": true
          }
        ]
      }
    ]
  }
}
```

Note: The above will fail for SessionStart due to the CLAUDE_PLUGIN_ROOT bug. The installation README must document the workaround: after `git clone`, run a one-time setup command that rewrites the command to an absolute path, OR the session-start.js script resolves its own plugin root via `installed_plugins.json`.

### Pattern 3: Output via systemMessage (CONFIRMED WORKING)

**What:** Hook scripts output JSON to stdout with a `systemMessage` field. This is the ONLY confirmed working channel for user-visible terminal output from SessionStart hooks in CLI Claude Code.

**Why not stderr:** `process.stderr` from hooks with exit code 0 is intentionally suppressed by Claude Code (issue #12653, closed as NOT PLANNED). The design intent is that stderr is only shown on non-zero exit or in verbose mode.

**Why not /dev/tty:** Hooks run sandboxed — `/dev/tty` writes do not reach the user's terminal.

**Why not process.stdout (raw text):** For SessionStart, stdout is added to Claude's context, not displayed to the user directly. This is correct behavior for context injection but wrong for user-visible display.

```javascript
// Source: confirmed in issue #12653 (NOT PLANNED resolution) and issue #15344
// scripts/session-start.js

'use strict';
const fs = require('fs');
const path = require('path');

// Resolve plugin root — CLAUDE_PLUGIN_ROOT may be empty during SessionStart
function resolvePluginRoot() {
  // Strategy 1: env var (works for non-SessionStart events)
  if (process.env.CLAUDE_PLUGIN_ROOT && fs.existsSync(process.env.CLAUDE_PLUGIN_ROOT)) {
    return process.env.CLAUDE_PLUGIN_ROOT;
  }
  // Strategy 2: parse installed_plugins.json
  const installedPluginsPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    '.claude', 'plugins', 'installed_plugins.json'
  );
  try {
    const data = JSON.parse(fs.readFileSync(installedPluginsPath, 'utf8'));
    const plugins = data.plugins || {};
    for (const [key, value] of Object.entries(plugins)) {
      if (key.includes('claude-code-quran') && value.installPath) {
        return value.installPath.replace(/\/$/, '');
      }
    }
  } catch (_) { /* not installed via marketplace */ }
  // Strategy 3: __dirname relative (works for --plugin-dir usage)
  return path.resolve(__dirname, '..');
}

function main() {
  const pluginRoot = resolvePluginRoot();
  const fallbackPath = path.join(pluginRoot, 'data', 'fallback.json');

  let ayah = null;
  try {
    const data = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    const ilmAyahs = (data.ayahs || []).filter(a => a.themes && a.themes.includes('ilm'));
    if (ilmAyahs.length > 0) {
      ayah = ilmAyahs[Math.floor(Math.random() * ilmAyahs.length)];
    }
  } catch (_) {
    // DATA-05: silent failure — no error shown to user
    process.stdout.write(JSON.stringify({ systemMessage: '' }));
    process.exit(0);
  }

  if (!ayah) {
    process.stdout.write(JSON.stringify({ systemMessage: '' }));
    process.exit(0);
  }

  const display = [
    '',
    '------',
    ayah.arabic,
    ayah.transliteration,
    `"${ayah.translation}"`,
    `\u2014 ${ayah.surah_name} ${ayah.surah_number}:${ayah.ayah_number}`,
    '------',
    ''
  ].join('\n');

  process.stdout.write(JSON.stringify({ systemMessage: display }));
  process.exit(0);
}

main();
```

### Pattern 4: Test Hook for Output Mechanism Verification

**What:** A one-time diagnostic hook that tests all four output channels, labeled for easy reading.

**When to use:** Run once at the very start of Phase 1 to empirically confirm which mechanism(s) are visible in the user's specific Claude Code setup.

```javascript
// scripts/test-output-mechanisms.js
'use strict';
const fs = require('fs');

// Test 1: process.stderr
process.stderr.write('[stderr] visible? --- mechanism: process.stderr\n');

// Test 2: process.stdout raw text (NOT JSON)
process.stdout.write('[stdout-raw] visible? --- mechanism: process.stdout (raw text)\n');

// Test 3: /dev/tty
try {
  fs.writeFileSync('/dev/tty', '[tty] visible? --- mechanism: fs.writeFileSync /dev/tty\n');
} catch (e) {
  process.stderr.write('[tty] FAILED: ' + e.message + '\n');
}

// Test 4: systemMessage JSON (this exits via stdout JSON, overrides stdout-raw)
// Must be the final write — only one stdout response is processed
const output = {
  systemMessage: '[systemMessage] visible? --- mechanism: systemMessage JSON field'
};
process.stdout.write(JSON.stringify(output));
process.exit(0);
```

Note: The test script above has a conflict — raw stdout text AND JSON stdout will both be written. In practice, Claude Code only processes the JSON if the last stdout write is valid JSON. Structure the test to write to stderr/tty first, then exit with systemMessage JSON. This means you'll see systemMessage for certain, while stderr/tty visibility is the empirical test.

### Pattern 5: fallback.json Schema

**What:** `data/fallback.json` structure satisfying DATA-01 and DATA-02.

```json
// data/fallback.json
{
  "version": "1.0",
  "ayahs": [
    {
      "arabic": "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
      "transliteration": "Iqra bismi rabbika alladhee khalaq",
      "translation": "Read in the name of your Lord who created.",
      "surah_name": "Al-Alaq",
      "surah_number": 96,
      "ayah_number": 1,
      "themes": ["ilm"],
      "time_slots": ["fajr", "duha"]
    }
  ]
}
```

### Anti-Patterns to Avoid

- **Putting components inside `.claude-plugin/`:** Only `plugin.json` lives in `.claude-plugin/`. hooks/, scripts/, data/ must be at the plugin root. Symptom: hooks never fire, no error message.
- **Using `process.cwd()` for plugin-relative paths:** `process.cwd()` is the project directory, not the plugin directory. Use `__dirname` + `path.resolve` to get the script's own location, then navigate from there.
- **Assuming `${CLAUDE_PLUGIN_ROOT}` works in SessionStart:** It doesn't — see CRITICAL BUG above. Always include the fallback resolution chain.
- **Writing anything to stderr expecting it to be visible (exit code 0):** Claude Code intentionally suppresses stderr from successful hooks. Use `systemMessage` for user-visible output.
- **Using ESM (`import`/`export`):** The project uses CommonJS. `require()` throughout. No `.mjs` extension or `"type": "module"` in any package.json.
- **Blocking hooks for display:** INFRA-04 requires `"async": true` on all display hooks. Without it, Claude's tool execution waits for the hook to complete.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plugin path resolution | Custom `__dirname` crawl with 3+ fallbacks | The three-strategy pattern above (env var → installed_plugins.json → `__dirname`) | Handles all installation methods: --plugin-dir, marketplace install, local install |
| JSON output | Custom stdout formatter | Plain `process.stdout.write(JSON.stringify({systemMessage: text}))` | That's the entire mechanism — no library needed |
| Random selection | Weighted/seeded RNG | `Math.random()` | Phase 1 only needs simple random; seed/no-repeat logic is Phase 2 (THEME-04) |
| Silent error handling | Complex error class hierarchy | `try/catch` with `process.exit(0)` | DATA-05 requires silent failure; never let exceptions reach the terminal |

**Key insight:** Claude Code's hook system is simple pipe-based IPC. The entire "display" problem reduces to: write valid JSON with `systemMessage` to stdout and exit 0. No terminal libraries, no formatting libs, no custom output streams.

---

## Common Pitfalls

### Pitfall 1: CLAUDE_PLUGIN_ROOT Empty During SessionStart

**What goes wrong:** Hook command is `node ${CLAUDE_PLUGIN_ROOT}/scripts/session-start.js` — the variable expands to empty string, Node gets path `/scripts/session-start.js`, throws MODULE_NOT_FOUND, hook fails silently (exit 1 but no user-visible error).

**Why it happens:** Confirmed bug in Claude Code (issue #27145, tracked as duplicate of #24529). The environment variable is set for PreToolUse, PostToolUse, and most other lifecycle events, but NOT for SessionStart or SessionEnd.

**How to avoid:** Three strategies (pick one based on installation method):
1. `--plugin-dir`: `__dirname` + `path.resolve('..')` works because the script IS at the resolved path
2. Marketplace install: parse `~/.claude/plugins/installed_plugins.json`
3. User-level workaround: installation README instructs user to run a setup script that rewrites the hook command to an absolute path in their local `hooks.json` copy

**Warning signs:** SessionStart hook shows `hook error` in `/hooks` status, or hook reports "success" but no output appears.

### Pitfall 2: stderr Suppressed for Successful Hooks

**What goes wrong:** Developer writes `process.stderr.write(output)` and exits 0 — nothing appears in terminal. Testing in a plain Node.js REPL shows stderr correctly, giving false confidence.

**Why it happens:** Claude Code intentionally redirects stderr from successful hooks away from the terminal. This is documented behavior (issue #12653 closed as NOT PLANNED). Stderr is only shown to users when exit code is 2 (blocking error shown to Claude) or in verbose mode (Ctrl+O).

**How to avoid:** Always use `systemMessage` JSON for anything the user should see. Reserve stderr for actual errors (exit code 2).

**Warning signs:** Testing `node scripts/session-start.js` directly in terminal shows output; running inside Claude Code shows nothing.

### Pitfall 3: Forgetting `async: true` Blocks Claude

**What goes wrong:** Hook fires on SessionStart but Claude Code hangs waiting for the hook to complete before proceeding. If the fallback.json read is slow (e.g., cold filesystem), noticeable latency.

**Why it happens:** `async: false` (the default) makes Claude Code wait for the hook's exit. For display-only hooks, there is no reason to block.

**How to avoid:** Always set `"async": true` on SessionStart and all display hooks. INFRA-04 is a hard requirement.

**Warning signs:** Claude Code startup feels sluggish; `/hooks` shows hooks in "running" state during startup.

### Pitfall 4: Components Inside .claude-plugin/ Directory

**What goes wrong:** Developer creates `.claude-plugin/hooks/hooks.json` — hooks are never discovered. No error message. Plugin loads (manifest is found) but hooks never fire.

**Why it happens:** Claude Code only looks for hooks at `{plugin_root}/hooks/hooks.json`. The `.claude-plugin/` directory is only for `plugin.json`. This is clearly documented but easy to misplace.

**How to avoid:** Strict rule: only `plugin.json` inside `.claude-plugin/`. Everything else at plugin root.

**Warning signs:** `/hooks` command shows no plugin hooks registered.

### Pitfall 5: JSON Parse Failure Breaks systemMessage Display

**What goes wrong:** Hook script writes some text to stdout before the JSON response, or the JSON is malformed. Claude Code fails to parse stdout, treats it as an error.

**Why it happens:** Any non-JSON content on stdout before or after the JSON response breaks parsing. Common mistake: using `console.log()` (which adds a newline) alongside `process.stdout.write(JSON.stringify(...))`.

**How to avoid:** Never use `console.log()` or `console.error()` in hook scripts. Use only `process.stdout.write(JSON.stringify(output))` as the final and only stdout write. Write early debug output to a temp log file instead.

**Warning signs:** Hooks return exit code 0 but `systemMessage` never appears.

---

## Code Examples

Verified patterns from official sources:

### hooks.json with async SessionStart hook

```json
// Source: https://code.claude.com/docs/en/hooks
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/session-start.js",
            "async": true
          }
        ]
      }
    ]
  }
}
```

### Hook JSON output format (stdout)

```javascript
// Source: https://code.claude.com/docs/en/hooks#json-output-format
// Exit with code 0, write JSON to stdout
const output = {
  systemMessage: "Text shown to user in CLI terminal"
};
process.stdout.write(JSON.stringify(output));
process.exit(0);
```

### Reading stdin (for hooks that receive tool input)

```javascript
// Source: https://code.claude.com/docs/en/hooks#hook-input-output
// SessionStart also receives JSON on stdin (session_id, cwd, etc.)
let inputData = '';
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  const input = JSON.parse(inputData);
  // input.hook_event_name, input.session_id, input.cwd
  // ...then do work and write JSON to stdout
});
```

### Plugin manifest minimum viable

```json
// Source: https://code.claude.com/docs/en/plugins-reference#required-fields
// .claude-plugin/plugin.json — name is the ONLY required field
{
  "name": "claude-code-quran",
  "version": "1.0.0",
  "description": "Quranic ayahs during Claude Code sessions"
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shell scripts (shebang `#!/bin/bash`) for hooks | Node.js scripts invoked explicitly as `node script.js` | Current requirement | INFRA-03 — avoids shell profile interference, explicit runtime |
| Hardcoded paths in hooks | `${CLAUDE_PLUGIN_ROOT}` variable | Current standard | INFRA-02 — but bugged for SessionStart as of 2026-03 |
| `plugin.json` at repo root | `.claude-plugin/plugin.json` | Current structure | Components must be at plugin root, manifest inside `.claude-plugin/` |
| `async: false` (blocking) | `async: true` for display hooks | Current best practice | INFRA-04 — non-blocking user experience |

**Deprecated/outdated:**
- Putting hook config inside `.claude-plugin/`: The `.claude-plugin/` directory only holds `plugin.json`. Community tutorials from mid-2025 sometimes show wrong structure.
- Using `sessionEnd` (lowercase): Hook events are PascalCase. `SessionEnd` vs `sessionEnd` — wrong case silently does nothing.
- ANSI codes directly in `systemMessage`: The systemMessage field is plain text displayed in the terminal. ANSI codes may render as raw escape sequences depending on how Claude Code processes the field. Phase 1 uses plain text only (Phase 2 concern).

---

## Open Questions

1. **Does `--plugin-dir` fix the CLAUDE_PLUGIN_ROOT bug for SessionStart?**
   - What we know: Issue #27145 describes the bug for installed plugins. The `--plugin-dir` flag loads plugins in-place without caching.
   - What's unclear: Whether `--plugin-dir` also leaves CLAUDE_PLUGIN_ROOT empty during SessionStart, or whether the bug only affects cached/installed plugins.
   - Recommendation: The test hook will resolve this. Build the plugin root resolver with all three strategies regardless, so it works in both modes.

2. **Does `systemMessage` support embedded newlines for multi-line display?**
   - What we know: `systemMessage` is a string field in JSON. Standard JSON `\n` escapes are valid. CLI displays it in format `SessionStart:startup says: [message]`.
   - What's unclear: Whether the display strips newlines or preserves them. Whether the dashed separator renders correctly.
   - Recommendation: The test hook can include a multi-line systemMessage to empirically confirm rendering.

3. **Does the `matcher: "startup"` filter work as expected for HOOK-01?**
   - What we know: SessionStart matchers filter on session source: `startup`, `resume`, `clear`, `compact`.
   - What's unclear: Whether omitting the matcher (match all SessionStart events) is preferable, or whether `startup` only is correct.
   - Recommendation: Use `startup` matcher to display the opening ayah only on fresh sessions, not on resume. This is the expected behavior for HOOK-01 ("when a new Claude Code session begins").

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — zero-dependency Node.js scripts; manual smoke tests |
| Config file | none |
| Quick run command | `node scripts/session-start.js` |
| Full suite command | `claude --plugin-dir . --no-tui` (one-shot smoke test) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | plugin.json is valid JSON with name field | manual | `node -e "require('./.claude-plugin/plugin.json')"` | Wave 0 |
| INFRA-02 | Scripts use CLAUDE_PLUGIN_ROOT or fallback resolver | manual review | n/a | Wave 0 |
| INFRA-03 | Hook commands use `node` as runtime | manual review of hooks.json | n/a | Wave 0 |
| INFRA-04 | All display hooks have `async: true` | manual review of hooks.json | n/a | Wave 0 |
| DATA-01 | fallback.json has >=50 ayahs with theme tags | automated | `node -e "const d=require('./data/fallback.json'); const a=d.ayahs; console.assert(a.length>=50); const themes=['ilm','tawakkul','ihsan','sabr','shukr']; themes.forEach(t=>console.assert(a.filter(x=>x.themes&&x.themes.includes(t)).length>=10,'theme '+t))"` | Wave 0 |
| DATA-02 | Each ayah has all required fields | automated | `node -e "const d=require('./data/fallback.json'); d.ayahs.forEach((a,i)=>['arabic','transliteration','translation','surah_name','surah_number','ayah_number'].forEach(f=>console.assert(a[f]!=null,'missing '+f+' at index '+i)))"` | Wave 0 |
| DATA-05 | Missing fallback.json exits silently (no throw) | automated | `node -e "process.env.CLAUDE_PLUGIN_ROOT='/nonexistent'; require('./scripts/session-start.js')"` — must exit 0 with no stack trace | Wave 0 |
| DISP-04 | Display output reaches terminal via confirmed mechanism | manual smoke | `claude --plugin-dir .` and observe startup | Wave 0 |
| HOOK-01 | SessionStart hook fires and output is visible | manual smoke | `claude --plugin-dir .` on fresh session | Wave 0 |

### Sampling Rate

- **Per task commit:** `node -e "require('./.claude-plugin/plugin.json')"` and `node scripts/session-start.js` (confirm no crash)
- **Per wave merge:** DATA-01 and DATA-02 automated assertions above
- **Phase gate:** Manual smoke test: `claude --plugin-dir .` shows ayah in terminal before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `data/fallback.json` — 50 curated ayahs (DATA-01, DATA-02)
- [ ] `.claude-plugin/plugin.json` — manifest file (INFRA-01)
- [ ] `hooks/hooks.json` — hook configuration (INFRA-03, INFRA-04)
- [ ] `scripts/session-start.js` — display script (HOOK-01, DISP-04)
- [ ] `scripts/test-output-mechanisms.js` — empirical output test (needed before session-start.js)
- [ ] `scripts/lib/load-ayah.js` — ayah selection from fallback.json (DATA-01, DATA-02, DATA-05)

---

## Sources

### Primary (HIGH confidence)

- `https://code.claude.com/docs/en/plugins-reference` — Full plugin manifest schema, directory structure, CLAUDE_PLUGIN_ROOT documentation, hooks format
- `https://code.claude.com/docs/en/hooks` — All hook events, hooks.json format, output mechanism (stdin/stdout/stderr/systemMessage), exit codes, async property
- `https://code.claude.com/docs/en/plugins` — Plugin creation guide, --plugin-dir flag, local testing workflow
- GitHub issue #27145 (closed as duplicate of #24529) — CLAUDE_PLUGIN_ROOT not set for SessionStart hooks
- GitHub issue #12653 (closed as NOT PLANNED) — SessionStart hook stderr not displaying; systemMessage confirmed as correct mechanism
- GitHub issue #15344 (closed as NOT PLANNED) — systemMessage works in CLI, not in VS Code

### Secondary (MEDIUM confidence)

- GitHub issue #11509 — SessionStart hooks with local file-based marketplace plugins; workaround of global hooks.json with absolute paths
- GitHub issue #9354 — CLAUDE_PLUGIN_ROOT in command markdown; CPR resolver workaround pattern
- `https://somethinghitme.com/2026/01/31/creating-local-claude-code-plugins/` — Local plugin development workflow
- Plugin cache behavior: `~/.claude/plugins/cache/` — confirmed installed plugins are copied not symlinked

### Tertiary (LOW confidence)

- `https://serenitiesai.com/articles/claude-code-hooks-guide-2026` — General hooks guide (community, not official)
- `https://smartscope.blog/en/generative-ai/claude/claude-code-hooks-guide/` — February 2026 hooks guide (community)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — zero deps confirmed by official docs and CONTEXT.md; Node.js built-ins are stable
- Plugin structure (manifest, directory layout): HIGH — official docs, clear schema
- Hook output mechanism (systemMessage): HIGH — confirmed by two closed GitHub issues (NOT PLANNED responses indicate intentional design, not a bug)
- CLAUDE_PLUGIN_ROOT bug for SessionStart: HIGH — confirmed by issue #27145 (closed as duplicate, unfixed as of 2026-03), multiple real-world reports
- Workaround strategies: MEDIUM — `__dirname` workaround and `installed_plugins.json` fallback are community-verified; behavior with `--plugin-dir` specifically is LOW (empirical test will confirm)
- Pitfalls: HIGH — all sourced from official issue tracker with confirmed status

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (30 days; plugin system is moderately active but CLAUDE_PLUGIN_ROOT bug may be fixed in any release)
