# QA Checklist

> Manual and automated checks to verify before deploy.

---

## Automated (Playwright E2E)

Run: `E2E=1 PUBLIC_DEMO=true npx playwright test --reporter=line`

| # | Test | Verifies |
|---|---|---|
| 1 | Paste → Score → Auto-Fix → Export | Full happy path, imported preview, canonical download |
| 2 | Upload → Score → Auto-Fix | File input pipeline |
| 3 | GitHub → Score (E2E fixture) | Fixture fallback, no network |
| 4 | MCP tab disabled | Visible + disabled + "Coming soon" |
| 5 | Header branding + About modal | `data-testid="header-brand"`, About opens/closes, LinkedIn link |
| 6 | Polish button disabled (PUBLIC_DEMO) | Button disabled + tooltip visible |
| 7 | /api/polish returns 403 | `POLISH_DISABLED` code in JSON body |

---

## Manual: PUBLIC_DEMO Enforcement

1. Start with `PUBLIC_DEMO=true npm run dev`
2. Open http://localhost:3000
3. Import a tool via paste or upload
4. Verify:
   - [ ] Results panel shows the **Imported** tab by default with your tool wrapped in `{ "tools": [...] }`.
   - [ ] **Export Fixed JSON** button is disabled before running Auto-fix.
   - [ ] Polish button is visible but **disabled** (greyed out)
   - [ ] Hovering shows tooltip: *"Disabled on public demo. Run locally to enable."*
   - [ ] `curl -X POST http://localhost:3000/api/polish -H 'Content-Type: application/json' -d '{"tools":[{"name":"test","description":"test","inputSchema":{}}]}'` returns **403**
   - [ ] Response body contains `"code": "POLISH_DISABLED"`
   - [ ] `curl http://localhost:3000/api/config` returns `"polishEnabled": false, "publicDemo": true`

---

## Manual: Local Polish (requires OPENAI_API_KEY)

1. Create `.env.local`:
   ```
   OPENAI_API_KEY=sk-your-key
   ENABLE_POLISH=true
   ```
2. Start with `npm run dev`
3. Verify:
   - [ ] Polish button is **enabled** (gold/warning color)
   - [ ] Import a tool, click Score, then click Auto-Fix
   - [ ] Click Polish — should show "Polishing..." spinner
   - [ ] After polish completes, chat shows "LLM polish complete!"
   - [ ] Re-score the polished tools — parameter names and types should be unchanged
   - [ ] `curl http://localhost:3000/api/config` returns `"polishEnabled": true, "publicDemo": false`

---

## Manual: Branding

1. Open http://localhost:3000
2. Verify:
   - [ ] Header shows "Tool Credit Score" + "by Zishan Ali Khan" + "Open-source lab project" pill
   - [ ] "ⓘ About" button opens modal
   - [ ] Modal shows LinkedIn link (clickable)
   - [ ] Modal shows GitHub placeholder text
   - [ ] Footer shows "Built by Zishan Ali Khan · LinkedIn"
   - [ ] Version appears in header and footer

---

## Build Check

```bash
npm run build
# Should complete with no errors
# All routes should show as ○ (static) or ƒ (dynamic)
```
