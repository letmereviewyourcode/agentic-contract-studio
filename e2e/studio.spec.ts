import { test, expect } from '@playwright/test';
import path from 'path';
import * as fs from 'fs';

test.describe('Agent Contract Studio E2E', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for the app to load — use stable testids
        await expect(page.getByTestId('import-panel')).toBeVisible();
        await expect(page.getByTestId('chat-panel')).toBeVisible();
        await expect(page.getByTestId('results-panel')).toBeVisible();
    });

    // ─── Test 1: Paste → Score → Auto-fix → Export ──────────────────
    test('Paste sample → Score → Auto-fix → Export', async ({ page }) => {
        // Click paste tab
        await page.getByTestId('tab-paste').click();

        // Click Load Sample button
        await page.getByTestId('btn-load-sample').click();

        // Verify textarea has content
        const textarea = page.getByTestId('paste-input');
        await expect(textarea).not.toBeEmpty();

        // Click Import
        await page.getByTestId('btn-import-paste').click();

        // Wait for chat to show import success
        await expect(page.getByTestId('chat-messages')).toContainText('imported successfully');

        // Verify Imported tab appears and shows canonical JSON wrapper
        await expect(page.getByTestId('results-tab-imported')).toBeVisible();
        await expect(page.getByTestId('imported-json-viewer')).toBeVisible();
        await expect(page.getByTestId('imported-json-viewer')).toContainText('"tools"');
        await expect(page.getByTestId('imported-json-viewer')).toContainText('"searchUsers"');

        // Click Score
        await page.getByTestId('score-button').click();

        // Wait for scoring to complete
        await expect(page.getByTestId('chat-messages')).toContainText('Scoring complete', { timeout: 10000 });

        // Verify scorecard appears in results
        await expect(page.getByTestId('score-gauge')).toBeVisible();
        await expect(page.getByTestId('score-value')).toBeVisible();

        // Click Auto-Fix
        await page.getByTestId('fix-button').click();

        // Wait for fix to complete
        await expect(page.getByTestId('chat-messages')).toContainText('Auto-fix complete', { timeout: 10000 });

        // Verify diff tab appears
        await expect(page.getByTestId('results-tab-diff')).toBeVisible();

        // Verify fixed JSON tab
        await page.getByTestId('results-tab-json').click();
        await expect(page.getByTestId('fixed-json-viewer')).toBeVisible();

        // Click Export — set up download listener
        const downloadPromise = page.waitForEvent('download');
        await page.getByTestId('export-json-button').click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe('tools-fixed.json');

        // Verify the downloaded file structure is canonical { tools: [...] }
        const downloadPath = await download.path();
        if (downloadPath) {
            const fileContent = fs.readFileSync(downloadPath, 'utf-8');
            const parsed = JSON.parse(fileContent);
            expect(parsed).toHaveProperty('tools');
            expect(Array.isArray(parsed.tools)).toBe(true);
            expect(parsed.tools.length).toBe(1);
            expect(parsed.tools[0].name).toBe('search_users');
        }
    });

    // ─── Test 2: Upload file → Score → Auto-fix ─────────────────────
    test('Upload file → Score → Auto-fix', async ({ page }) => {
        // Click upload tab
        await page.getByTestId('tab-upload').click();

        // Upload the sample fixture file
        const fileInput = page.getByTestId('file-input');
        const filePath = path.resolve('./public/examples/tools.json');
        await fileInput.setInputFiles(filePath);

        // Wait for import success
        await expect(page.getByTestId('chat-messages')).toContainText('imported successfully', { timeout: 10000 });

        // Verify Imported tab appears
        await expect(page.getByTestId('results-tab-imported')).toBeVisible();

        // Click Score
        await page.getByTestId('score-button').click();
        await expect(page.getByTestId('chat-messages')).toContainText('Scoring complete', { timeout: 10000 });

        // Verify scorecard
        await expect(page.getByTestId('score-gauge')).toBeVisible();

        // Click Auto-Fix
        await page.getByTestId('fix-button').click();
        await expect(page.getByTestId('chat-messages')).toContainText('Auto-fix complete', { timeout: 10000 });
    });

    // ─── Test 3: GitHub import → Score ──────────────────────────────
    test('GitHub import → Score (E2E fixture)', async ({ page }) => {
        // Click GitHub tab
        await page.getByTestId('tab-github').click();

        // Enter a GitHub URL
        const githubInput = page.getByTestId('github-input');
        await githubInput.fill('https://github.com/example/test-repo');

        // Mock the API response to return the E2E fixture
        await page.route('/api/import/github', async route => {
            const fs = require('fs');
            const path = require('path');
            const fixturePath = path.join(process.cwd(), 'public', 'examples', 'tools.json');
            const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

            // We need to return the identical shape extractTools would return
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    tools: data,
                    source: 'github:https://github.com/example/test-repo (E2E fixture)'
                }),
            });
        });

        // Click Import from GitHub
        await page.getByTestId('btn-import-github').click();

        // Wait for import (uses E2E fixture fallback)
        await expect(page.getByTestId('chat-messages')).toContainText('imported successfully', { timeout: 15000 });

        // Verify Imported tab appears
        await expect(page.getByTestId('results-tab-imported')).toBeVisible();

        // Click Score
        await page.getByTestId('score-button').click();
        await expect(page.getByTestId('chat-messages')).toContainText('Scoring complete', { timeout: 10000 });

        // Verify scorecard
        await expect(page.getByTestId('score-gauge')).toBeVisible();
    });

    // ─── Test 4: MCP Server URL tab visible + disabled ──────────────
    test('MCP Server URL tab visible and disabled', async ({ page }) => {
        // MCP tab exists
        const mcpTab = page.getByTestId('tab-mcp');
        await expect(mcpTab).toBeVisible();
        await expect(mcpTab).toBeDisabled();

        // Click it anyway (should not switch — tab is disabled)
        await mcpTab.click({ force: true });

        // Verify input is disabled
        const mcpInput = page.getByTestId('mcp-input');
        if (await mcpInput.isVisible()) {
            await expect(mcpInput).toBeDisabled();
            await expect(page.getByTestId('mcp-coming-soon')).toContainText('Coming soon');
        }
    });

    // ─── Test 5: Branding + About modal ─────────────────────────────
    test('Header branding and About modal', async ({ page }) => {
        // Header brand is visible
        await expect(page.getByTestId('header-brand')).toBeVisible();

        // About button exists and is clickable
        const aboutBtn = page.getByTestId('about-button');
        await expect(aboutBtn).toBeVisible();
        await aboutBtn.click();

        // About modal opens
        const modal = page.getByTestId('about-modal');
        await expect(modal).toBeVisible();

        // LinkedIn link is present
        const linkedinLink = modal.getByTestId('linkedin-link');
        await expect(linkedinLink).toBeVisible();

        // Close modal
        await page.keyboard.press('Escape');
        // Modal overlay click closes it — but pressing Escape may not work,
        // so click the close button if modal is still visible
        if (await modal.isVisible()) {
            await modal.locator('button[aria-label="Close"]').click();
        }
    });

    // ─── Test 6: Polish disabled in PUBLIC_DEMO mode but enabled via BYOK ─
    test('Polish disabled in PUBLIC_DEMO mode but enabled via BYOK', async ({ page }) => {
        // Load some tools first so the button is not disabled due to missing tools
        await page.getByTestId('tab-paste').click();
        await page.getByTestId('btn-load-sample').click();
        await page.getByTestId('btn-import-paste').click();

        // Run the pipeline to unlock Polish
        await page.getByTestId('score-button').click();
        await expect(page.getByTestId('chat-messages')).toContainText('Scoring complete', { timeout: 10000 });

        await page.getByTestId('fix-button').click();
        await expect(page.getByTestId('chat-messages')).toContainText('Auto-fix complete', { timeout: 10000 });

        // Polish button should be visible but disabled
        const polishBtn = page.getByTestId('polish-button');
        await expect(polishBtn).toBeVisible();
        await expect(polishBtn).toBeDisabled();

        // Tooltip should explain why
        const tooltip = page.getByTestId('polish-tooltip');
        await expect(tooltip).toContainText('Provide your OpenAI-compatible API key');

        // Open About Modal to inject BYOK
        await page.getByTestId('about-button').click();
        await page.getByTestId('byok-input-key').fill('sk-proj-testkey123');
        await page.getByTestId('byok-input-url').fill('http://localhost:8080/v1');
        await page.getByTestId('about-modal').locator('button[aria-label="Close"]').click();

        // Button should now be enabled
        await expect(polishBtn).not.toBeDisabled();
        await expect(tooltip).not.toBeVisible();

        // Mock the /api/polish endpoint to prevent real API calls during test
        await page.route('/api/polish', async route => {
            const request = route.request();
            const postData = request.postDataJSON();

            // Verify our neutral configs were passed
            expect(postData.userApiKey).toBe('sk-proj-testkey123');
            expect(postData.userBaseUrl).toBe('http://localhost:8080/v1');

            await route.fulfill({
                status: 200,
                json: {
                    polished: [{
                        name: 'mock_polished_tool',
                        description: 'This is a mock polished description.',
                        inputSchema: { type: 'object', properties: {} }
                    }],
                    explanation: '**mock_polished_tool**: Polished the description.'
                }
            });
        });

        // Click polish and verify the mock response is handled
        await polishBtn.click();
        await expect(page.getByTestId('chat-messages')).toContainText('LLM polish complete!');
    });

    // ─── Test 7: /api/polish returns 400 with MISSING_API_KEY code ───────
    test('/api/polish returns 400 with MISSING_API_KEY code', async ({ request }) => {
        const res = await request.post('/api/polish', {
            data: { tools: [{ name: 'test', description: 'test', inputSchema: {} }] },
        });

        expect(res.status()).toBe(400);

        const body = await res.json();
        expect(body.ok).toBe(false);
        expect(body.error.code).toBe('MISSING_API_KEY');
    });
    // ─── Test 8: Edge Case - Invalid JSON Paste ────────────────────────
    test('Edge Case: Invalid JSON paste gracefully fails', async ({ page }) => {
        await page.getByTestId('tab-paste').click();
        await page.getByTestId('paste-input').fill('this is not { valid json ]');
        await page.getByTestId('btn-import-paste').click();
        await expect(page.getByTestId('import-error')).toContainText('Invalid JSON', { timeout: 10000 });
    });

    // ─── Test 9: Edge Case - Invalid GitHub URL ────────────────────────
    test('Edge Case: Invalid GitHub URL gracefully fails', async ({ page }) => {
        await page.getByTestId('tab-github').click();
        await page.getByTestId('github-input').fill('not-a-valid-url');
        await page.getByTestId('btn-import-github').click();
        await expect(page.getByTestId('import-error')).toContainText('Invalid GitHub URL', { timeout: 10000 });
    });

    // ─── Test 10: Edge Case - BYOK Test Connection Failure ──────────────
    test('Edge Case: BYOK Test Connection upstream failure', async ({ page }) => {
        await page.getByTestId('about-button').click();
        const modal = page.getByTestId('about-modal');

        // Fill with dummy info
        await page.getByTestId('byok-input-key').fill('sk-test-fail-key');
        await page.getByTestId('byok-input-url').fill('http://localhost:9999/bad-url');

        // Mock the /api/polish endpoint to fail with 502 Upstream Error
        await page.route('/api/polish', async route => {
            await route.fulfill({
                status: 502,
                json: { error: { code: 'UPSTREAM_ERROR', message: 'Upstream LLM error. Please check your configuration (Key, Base URL, or Model).' } }
            });
        });

        // Click Test
        await modal.getByRole('button', { name: 'Test' }).click();

        // Modal should display the exact fallback error text
        await expect(modal).toContainText('❌ Failed: Upstream LLM error', { timeout: 10000 });
    });

    // ─── Test 11: Edge Case - Polish missing explanation fallback ──────
    test('Edge Case: Polish LLM missing explanation fallback', async ({ page }) => {
        // Prepare pipeline
        await page.getByTestId('tab-paste').click();
        await page.getByTestId('btn-load-sample').click();
        await page.getByTestId('btn-import-paste').click();
        await page.getByTestId('score-button').click();
        await expect(page.getByTestId('chat-messages')).toContainText('Scoring complete');
        await page.getByTestId('fix-button').click();
        await expect(page.getByTestId('chat-messages')).toContainText('Auto-fix complete');

        // Inject key to enable polish
        await page.getByTestId('about-button').click();
        await page.getByTestId('byok-input-key').fill('sk-test-key-no-explanation');
        await page.getByTestId('about-modal').locator('button[aria-label="Close"]').click();

        // Mock polish response WITHOUT an explanation (simulating LLM hallucination fallback)
        await page.route('/api/polish', async route => {
            await route.fulfill({
                status: 200,
                json: {
                    polished: [{ name: 'mock_polished_tool', description: 'desc', inputSchema: {} }]
                    // no explanation field
                }
            });
        });

        await page.route('/api/score', async route => {
            await route.fulfill({
                status: 200,
                json: { results: [] }
            });
        });

        await page.getByTestId('polish-button').click();

        // Fallback generic message should appear since explanation was missing
        await expect(page.getByTestId('chat-messages')).toContainText('Descriptions and examples have been rewritten for clarity');
    });

    // ─── Test 12: Edge Case - GitHub repo without static JSON gracefully fails ──────
    test('Edge Case: GitHub repo without static JSON gracefully fails', async ({ page }) => {
        // Mock the GitHub import route to return the exact 404 error we added
        await page.route('/api/import/github', async route => {
            await route.fulfill({
                status: 404,
                json: {
                    success: false,
                    tools: [],
                    error: 'Could not find a static JSON tool spec in this repo. v0.1 GitHub import supports repos with tools.json/mcp.json. For dynamic MCP server codebases, use MCP URL import (coming in v0.2).'
                }
            });
        });

        await page.getByTestId('tab-github').click();
        await page.getByTestId('github-input').fill('https://github.com/github/github-mcp-server');
        await page.getByTestId('btn-import-github').click();

        await expect(page.getByTestId('import-error')).toContainText('dynamic MCP server codebases', { timeout: 10000 });
    });
});
