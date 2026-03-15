---
phase: 2
slug: display-rendering-and-theming
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node (inline assert scripts per task, no test runner) |
| **Config file** | none — Wave 0 installs stub test files |
| **Quick run command** | `node scripts/lib/render-panel.test.js` |
| **Full suite command** | `node scripts/lib/render-panel.test.js && node scripts/lib/select-ayah.test.js && node scripts/pre-tool-use.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/lib/render-panel.test.js`
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | DISP-01 | unit | `node scripts/lib/render-panel.test.js` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | DISP-02, DISP-03 | unit | `node scripts/lib/render-panel.test.js --mosque` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | DISP-05 | unit | `NO_COLOR=1 node scripts/lib/render-panel.test.js` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 1 | DISP-06 | unit | `node scripts/lib/render-panel.test.js --arabic` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | THEME-01, THEME-02, THEME-03 | unit | `node scripts/lib/select-ayah.test.js` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | THEME-04 | unit | `node scripts/lib/select-ayah.test.js --no-repeat` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | RATE-01, RATE-02 | unit | `node scripts/pre-tool-use.test.js` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 2 | RATE-03 | unit | `node scripts/pre-tool-use.test.js --exempt` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 2 | HOOK-02 | integration | `node -e "process.stdin.push(JSON.stringify({tool_name:'Read'})+'\n'); require('./scripts/pre-tool-use.js')"` | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 2 | DISP-01–03 | manual | See Manual Verifications | ✅ | ⬜ pending |
| 2-05-02 | 05 | 2 | SessionStart upgrade | manual | See Manual Verifications | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/lib/render-panel.test.js` — stubs for DISP-01 through DISP-06
- [ ] `scripts/lib/select-ayah.test.js` — stubs for THEME-01 through THEME-04
- [ ] `scripts/pre-tool-use.test.js` — stubs for RATE-01 through RATE-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Framed panel with mosque art and colors renders in live session | DISP-01, DISP-02 | Requires live Claude Code session to see ANSI rendering | Run `claude --plugin-dir .`, confirm framed green panel with mosque art and ayah text appears |
| Correct theme displayed for tool type | THEME-01 | Requires live session with specific tool calls | In session: read a file (ilm), run bash (tawakkul), write a file (ihsan) — verify theme matches |
| SessionStart now shows full panel (not Phase 1 dashes) | DISP-01 | Requires live session | Start new session, confirm framed panel instead of plain `------` format |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
