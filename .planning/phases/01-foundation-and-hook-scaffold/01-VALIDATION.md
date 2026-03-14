---
phase: 1
slug: foundation-and-hook-scaffold
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node (manual invocation + exit code checks; no test runner required for Phase 1) |
| **Config file** | none — Wave 0 installs minimal test harness |
| **Quick run command** | `node scripts/test-output-mechanisms.js` |
| **Full suite command** | `node scripts/test-output-mechanisms.js && node scripts/display-ayah.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/test-output-mechanisms.js`
- **After every plan wave:** Run `node scripts/test-output-mechanisms.js && node scripts/display-ayah.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | INFRA-01 | integration | `node -e "require('./plugin.json')"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | INFRA-02 | integration | `node -e "require('./hooks/hooks.json')"` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | INFRA-03 | manual | See Manual Verifications | ✅ | ⬜ pending |
| 1-01-04 | 01 | 1 | INFRA-04 | unit | `node scripts/resolve-plugin-root.js && echo "PASS"` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | DATA-01 | unit | `node -e "const d=require('./data/fallback.json'); console.assert(d.ayahs.length>=50)"` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | DATA-02 | unit | `node scripts/validate-fallback-schema.js` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | DATA-05 | unit | `node scripts/validate-fallback-schema.js --themes` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | HOOK-01 | integration | `node scripts/test-output-mechanisms.js` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | DISP-04 | integration | `node scripts/display-ayah.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-output-mechanisms.js` — stub that tries all four output mechanisms for HOOK-01
- [ ] `scripts/validate-fallback-schema.js` — validates fallback.json structure for DATA-01, DATA-02, DATA-05
- [ ] `scripts/resolve-plugin-root.js` — stub resolver test for INFRA-04
- [ ] `scripts/display-ayah.js` — stub for DISP-04 integration test

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code loads plugin without errors | INFRA-03 | Requires running `claude --plugin-dir .` interactively | Start a Claude Code session with `--plugin-dir .` and verify no load errors appear |
| SessionStart displays ayah in terminal | HOOK-01 + DISP-04 | Requires live Claude Code session | Start session, confirm ayah block appears with Arabic → transliteration → translation → reference format |
| Silent failure when fallback is only source | DATA-01 | Requires environment where no API key is set | Remove any API config, start session, confirm no error messages or stack traces appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
