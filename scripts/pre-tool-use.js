'use strict';
const fs   = require('fs');
const path = require('path');

const { selectAyah }  = require('./lib/select-ayah');
const { renderPanel } = require('./lib/render-panel');

// ---------------------------------------------------------------------------
// Rate-limit constants (RATE-01, RATE-02)
// ---------------------------------------------------------------------------

const RATE_FILE   = '/tmp/claude-code-quran-last-display';
const COOLDOWN_MS = 60 * 1000;  // 60 seconds

// ---------------------------------------------------------------------------
// Rate-limit helpers
// ---------------------------------------------------------------------------

function isWithinCooldown() {
  try {
    const last = parseInt(fs.readFileSync(RATE_FILE, 'utf-8').trim(), 10);
    return (Date.now() - last) < COOLDOWN_MS;
  } catch (_) { return false; }  // no file = never displayed
}

function stampCooldown() {
  try { fs.writeFileSync(RATE_FILE, String(Date.now()), 'utf-8'); } catch (_) {}
}

// ---------------------------------------------------------------------------
// resolvePluginRoot — three-strategy fallback (copied verbatim from
// session-start.js; each script is self-contained per established pattern)
// ---------------------------------------------------------------------------

/**
 * Resolve the plugin root using three strategies in priority order:
 * 1. CLAUDE_PLUGIN_ROOT env var (works for non-SessionStart hooks)
 * 2. ~/.claude/plugins/installed_plugins.json (marketplace installs)
 * 3. __dirname relative — scripts/ is one level below root (works for --plugin-dir)
 */
function resolvePluginRoot() {
  // Strategy 1: env var
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    try {
      fs.accessSync(process.env.CLAUDE_PLUGIN_ROOT);
      return process.env.CLAUDE_PLUGIN_ROOT;
    } catch (_) {}
  }
  // Strategy 2: installed_plugins.json (marketplace installs)
  try {
    const installFile = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.claude', 'plugins', 'installed_plugins.json'
    );
    const data = JSON.parse(fs.readFileSync(installFile, 'utf8'));
    const plugins = data.plugins || {};
    for (const [key, val] of Object.entries(plugins)) {
      if (key.includes('claude-code-quran') && val.installPath) {
        return val.installPath.replace(/\/$/, '');
      }
    }
  } catch (_) {}
  // Strategy 3: __dirname relative (works for --plugin-dir; scripts/ is one level below root)
  return path.resolve(__dirname, '..');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  // 1. Read stdin synchronously (PreToolUse JSON payload)
  let hookInput = {};
  try {
    hookInput = JSON.parse(fs.readFileSync(0, 'utf-8'));
  } catch (_) {}

  // 2. Extract tool name and session id from hook input
  const toolName  = hookInput.tool_name  || '';
  const sessionId = hookInput.session_id || process.env.CLAUDE_SESSION_ID || '';
  // NOTE: toolName is always a real Claude Code tool name here (e.g. 'Read', 'Bash').
  // PreToolUse fires BEFORE tool execution — there is no error context available at this
  // point. The 'error' → 'sabr' path in TOOL_THEME_MAP is reserved for Phase 3
  // (PostToolUse), which receives error context after tool execution completes.
  // In Phase 2, 'sabr' is only reachable via the evening time-of-day window
  // (resolveTimeOfDayTheme, hours 17–3). Do NOT synthesize toolName='error' here.

  // 3. Rate-limit check — silent skip if within cooldown window
  if (isWithinCooldown()) {
    process.stdout.write(JSON.stringify({ systemMessage: '' }));
    process.exit(0);
  }

  // 4. Resolve plugin root
  const pluginRoot = resolvePluginRoot();

  // 5. Select thematic ayah (null = data unavailable)
  const ayah = selectAyah(toolName, sessionId, pluginRoot);
  if (!ayah) {
    process.stdout.write(JSON.stringify({ systemMessage: '' }));
    process.exit(0);
  }

  // 6. Render the panel
  const displayText = renderPanel(ayah, { cols: process.stdout.columns || 80 });

  // 7. Stamp cooldown BEFORE output (so parallel calls also see the gate)
  stampCooldown();

  // 8. Write systemMessage JSON to stdout (sole working output channel)
  //    NEVER console.log(), NEVER process.stderr.write()
  process.stdout.write(JSON.stringify({ systemMessage: displayText }));

  // 9. Exit cleanly
  process.exit(0);
}

try {
  main();
} catch (_) {
  // DATA-05: any unhandled error — empty systemMessage, never crash
  process.stdout.write(JSON.stringify({ systemMessage: '' }));
  process.exit(0);
}
