# Changelog

## [0.4.0] — 2026-02-21 (Export Correctness & UX Pass)

### Added
- **Imported Preview Tab**: Added a dedicated "Imported" tab in the Results Panel to preview the normalized JSON immediately after import (paste, upload, or GitHub).
- **Canonical Export Wrapper**: Enforced a single canonical export shape (`{ "tools": [...] }`) for all exported JSON files, regardless of the input format.
- **Export Validation**: The "Export Fixed JSON" button is now disabled until Auto-Fix has been run, ensuring that users always export the most up-to-date and correct state.
- **E2E Tests**: Added specific assertions for the Imported tab visibility and verified the downloaded file content structure.

---

## [0.3.0] — 2026-02-21 (Branding + Polish Hardening)

### Added
- **App header**: "Tool Credit Score" title + "by Zishan Ali Khan" + "Open-source lab project" pill + "ⓘ About" button
- **About modal**: LinkedIn link, GitHub placeholder, version, mode note
- **Footer**: Attribution + LinkedIn link + version
- **Polish tooltip**: Disabled button shows "Disabled on public demo. Run locally to enable."
- **`POLISH_MODEL`** env var: Configurable model (default `gpt-4o-mini`)
- **`docs/POLISH_MODE.md`**: What polish does/doesn't do, three-gate enforcement, security
- **`docs/QA_CHECKLIST.md`**: 7 automated + manual verification steps
- **Demo script polish path**: Demo B section for local polish add-on
- **3 new E2E tests**: Branding/About modal, polish button disabled, /api/polish 403 enforcement

### Changed
- **Polish enforcement**: Three explicit gates (PUBLIC_DEMO, ENABLE_POLISH, OPENAI_API_KEY) — all must pass
- **`/api/polish`**: Returns `{ ok: false, error: { code: "POLISH_DISABLED", message: ... } }` when denied (403)
- **`/api/config`**: Returns `{ polishEnabled, publicDemo, version }` instead of `{ polishAvailable }`
- **`ENABLE_POLISH`**: Default changed to `false` (was implicitly true if key present)
- **Polish system prompt**: Now explicitly states "Do NOT change core schema semantics"
- **Stable testids**: `score-button`, `fix-button`, `polish-button`, `export-json-button`, `header-brand`, `about-button`, `about-modal`, `linkedin-link`
- **Playwright config**: Runs with `PUBLIC_DEMO=true` to verify enforcement

### Changed (UI)
- Body is now flex column (header → 3-column → footer)
- ChatKit mode pills use CSS classes instead of inline styles

---

## [0.2.0] — 2026-02-21 (Enterprise Audit Redesign)

### Changed
- **UI**: Replaced neon glassmorphism with enterprise audit aesthetic (charcoal + muted teal)
- **ResultsPanel**: Big numeric scorecard + grade pill + category bars
- **Issues list**: Left-border severity indicators and fix suggestions
- **Diff viewer**: Red/green lines with strikethrough deletions and line counts
- **ChatPanel**: ChatKit availability detection (Local Mode / ChatKit Live badge)

---

## [0.1.0] — 2026-02-21 (Initial Build)

### Added
- Next.js 16 App Router scaffold with TypeScript + Tailwind
- Deterministic scoring engine (0–100) with 5 weighted categories
- Deterministic auto-fix transformer
- Optional LLM polish via GPT-4o-mini
- Multi-format JSON parser
- GitHub public repo import
- 3-column UI: Import Panel, Chat Panel, Results Panel
- ChatKit integration (`@openai/chatkit-react`)
- Playwright E2E tests (4 scenarios)
- Documentation suite
