---
phase: 01-foundation-and-hook-scaffold
plan: 02
subsystem: data
tags: [json, quran, ayah, fallback, dataset]

# Dependency graph
requires: []
provides:
  - 50 curated Quranic ayahs in data/fallback.json with full schema and theme/time distribution
  - Theme tags: ilm(10), tawakkul(11), ihsan(10), sabr(12), shukr(11)
  - Time-slot tags: fajr, duha, asr, maghrib, isha on every ayah
affects:
  - scripts/session-start.js (direct consumer via require/readFileSync)
  - Phase 2 selection logic (theme + time_slot routing)
  - All hook scripts that display ayahs

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ayah object schema: arabic, transliteration, translation, surah_name, surah_number, ayah_number, themes[], time_slots[]"
    - "Version field at top-level: { version: '1.0', ayahs: [...] }"
    - "Multi-theme tagging: ayahs may carry multiple theme tags and count toward all"

key-files:
  created:
    - data/fallback.json
  modified: []

key-decisions:
  - "Used Hilali-Khan translations as specified; wording drawn from widely-recognized renderings of each ayah"
  - "10 ayahs per theme minimum — several themes got 11-12 by allowing multi-theme ayahs to count toward all their tags"
  - "Time slots assigned by thematic fit: fajr/isha for tawakkul/shukr (surrender/reflection), duha/asr for ilm/ihsan (effort/action)"
  - "Prioritized well-known, frequently-cited ayahs across diverse surahs rather than clustering in a few surahs"

patterns-established:
  - "fallback.json schema: top-level version + ayahs array — consume with require() or fs.readFileSync + JSON.parse"
  - "Validation pattern: node -e inline script checks array length, field presence, and per-theme count"

requirements-completed: [DATA-01, DATA-02, DATA-05]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 1 Plan 02: Fallback Ayah Dataset Summary

**50 curated Quranic ayahs in data/fallback.json covering ilm, tawakkul, ihsan, sabr, shukr — each with Arabic text, transliteration, Hilali-Khan translation, and time-slot tags for Phase 2 routing**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-15T04:48:38Z
- **Completed:** 2026-03-15T04:51:58Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Created `data/fallback.json` with exactly 50 ayahs, 505 lines, valid JSON
- All 5 themes covered with >= 10 ayahs each: ilm(10), tawakkul(11), ihsan(10), sabr(12), shukr(11)
- Every ayah has all 6 required DATA-02 fields plus themes and time_slots arrays
- Time slots properly distributed: fajr/isha for reflective themes, duha/asr for active themes
- Validation script prints "DATA OK" and "fallback.json OK: 50 ayahs, all themes covered"

## Task Commits

Each task was committed atomically:

1. **Task 1: Curate and write the 50-ayah fallback dataset** - `db4db69` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `data/fallback.json` - 50 curated Quranic ayahs with full schema, theme tags, and time-slot tags

## Decisions Made

- Used Hilali-Khan translation wording drawn from widely-recognized renderings of each ayah (as specified in plan)
- Allowed multi-theme ayahs (e.g. tawakkul+shukr, sabr+tawakkul, ihsan+tawakkul) so each theme naturally met the 10-ayah minimum
- Time slots assigned by thematic fit: fajr/isha for tawakkul and shukr (surrender, reflection, peace), duha/asr for ilm and ihsan (effort, action, excellence)
- Selected from diverse surahs — Al-Baqarah, Al-Alaq, Ibrahim, Az-Zumar, Al-Fatihah, and many others — to avoid clustering
- Arabic text includes tashkeel (diacritics) where available in well-known ayahs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `data/fallback.json` is fully ready for Plan 03 (`scripts/session-start.js`) to consume via `require()` or `fs.readFileSync`
- Phase 1 selection logic (random pick from `ilm` theme) can be implemented immediately
- Phase 2 theme/time_slot routing logic has all tags it needs — no data migration required
- No blockers.

---
*Phase: 01-foundation-and-hook-scaffold*
*Completed: 2026-03-15*
