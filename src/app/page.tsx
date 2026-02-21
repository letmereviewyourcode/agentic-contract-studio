'use client';

import { useState, useCallback, useEffect } from 'react';
import { ImportPanel } from '@/components/ImportPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import type { MCPTool, ScoreResult, FixResult } from '@/lib/types';

const APP_VERSION = 'v0.1.x';
const LINKEDIN_URL = 'https://www.linkedin.com/in/zishanalikhan';
const GITHUB_URL = ''; // Set after repo publish

export default function Home() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [scoreResults, setScoreResults] = useState<ScoreResult[]>([]);
  const [fixResults, setFixResults] = useState<FixResult[]>([]);
  const [fixedTools, setFixedTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [polishEnabled, setPolishEnabled] = useState(false);
  const [publicDemo, setPublicDemo] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Welcome to **Agent Contract Studio**! 🛠️\n\nImport your MCP tool specs from the left panel, then use the actions below to analyze and improve them.\n\n• **Score** — Run the deterministic rubric (0–100)\n• **Auto-Fix** — Normalize & add missing fields\n• **Polish** — LLM-powered rewrite (optional)\n• **Export** — Download improved specs' },
  ]);

  // Fetch config on mount
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => {
        setPolishEnabled(d.polishEnabled ?? false);
        setPublicDemo(d.publicDemo ?? false);
      })
      .catch(() => { });
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setChatMessages(prev => [...prev, { role, content }]);
  }, []);

  const handleToolsLoaded = useCallback((loadedTools: MCPTool[], source: string) => {
    setTools(loadedTools);
    setScoreResults([]);
    setFixResults([]);
    setFixedTools([]);
    addMessage('user', `Loaded ${loadedTools.length} tool(s) from ${source}`);
    const toolNames = loadedTools.map(t => '`' + t.name + '`').join(', ');
    addMessage('assistant', `✅ **${loadedTools.length} tool(s)** imported successfully!\n\nTools: ${toolNames}\n\nClick **Score** to analyze them.`);
  }, [addMessage]);

  const handleScore = useCallback(async () => {
    if (tools.length === 0) {
      addMessage('assistant', '⚠️ No tools loaded. Import tools from the left panel first.');
      return;
    }
    setLoading('score');
    addMessage('user', 'Score these tools');
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScoreResults(data.results);
      const avg = Math.round(data.results.reduce((s: number, r: ScoreResult) => s + r.overallScore, 0) / data.results.length);
      const totalIssues = data.results.reduce((s: number, r: ScoreResult) => s + r.issues.length, 0);
      addMessage('assistant', `📊 **Scoring complete!**\n\n• Average score: **${avg}/100** (Grade: **${data.results[0]?.grade}**)\n• Total issues found: **${totalIssues}**\n\nCheck the **Scorecard** tab for details. Click **Auto-Fix** to address the issues.`);
    } catch (e) {
      addMessage('assistant', `❌ Error scoring: ${(e as Error).message}`);
    } finally {
      setLoading(null);
    }
  }, [tools, addMessage]);

  const handleFix = useCallback(async () => {
    if (tools.length === 0) {
      addMessage('assistant', '⚠️ No tools loaded. Import tools first.');
      return;
    }
    setLoading('fix');
    addMessage('user', 'Auto-fix these tools');
    try {
      const res = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFixedTools(data.fixed);
      setFixResults(data.details);
      const totalChanges = data.changes.length;
      addMessage('assistant', `🔧 **Auto-fix complete!**\n\n• **${totalChanges}** changes applied\n• Fixed tools are ready for export\n\nCheck the **Diff** tab in the Audit Results panel. Click **Export Fixed JSON** to download.`);

      // Re-score the fixed tools
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: data.fixed }),
      });
      const scoreData = await scoreRes.json();
      if (!scoreData.error) {
        setScoreResults(scoreData.results);
      }
    } catch (e) {
      addMessage('assistant', `❌ Error fixing: ${(e as Error).message}`);
    } finally {
      setLoading(null);
    }
  }, [tools, addMessage]);

  const handlePolish = useCallback(async () => {
    if (tools.length === 0) {
      addMessage('assistant', '⚠️ No tools loaded. Import tools first.');
      return;
    }
    setLoading('polish');
    addMessage('user', 'Polish with LLM');
    try {
      const res = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: fixedTools.length > 0 ? fixedTools : tools, userApiKey }),
      });
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message);
      setFixedTools(data.polished);
      addMessage('assistant', `✨ **LLM polish complete!** Descriptions and examples have been rewritten for clarity. Check the **Diff** tab.`);
    } catch (e) {
      addMessage('assistant', `❌ Polish error: ${(e as Error).message}`);
    } finally {
      setLoading(null);
    }
  }, [tools, fixedTools, addMessage]);

  const handleExport = useCallback(() => {
    if (fixedTools.length === 0) {
      addMessage('assistant', '⚠️ Export is only available after Auto-fix has been run.');
      return;
    }
    const exportData = { tools: fixedTools };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tools-fixed.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    addMessage('user', 'Export tools');
    addMessage('assistant', '📥 **Exported!** `tools-fixed.json` has been downloaded.');
  }, [fixedTools, addMessage]);

  return (
    <>
      {/* ─── App Header ────────────────────────────────────────────── */}
      <header className="app-header" data-testid="header-brand">
        <div className="app-header-left">
          <img src="/logo.png" alt="Tool Credit Score" className="app-header-logo" />
          <span className="app-header-title">Tool Credit Score</span>
          <span className="app-header-subtitle">by Zishan Ali Khan</span>
          <span className="app-header-pill">Open-source lab project</span>
        </div>
        <div className="app-header-right">
          <span className="app-header-version">{APP_VERSION}</span>
          <button
            className="app-header-about-btn"
            onClick={() => setShowAbout(true)}
            data-testid="about-button"
            aria-label="About"
          >
            ⓘ About
          </button>
        </div>
      </header>

      {/* ─── 3-Column Layout ───────────────────────────────────────── */}
      <div className="app-layout">
        <ImportPanel onToolsLoaded={handleToolsLoaded} />
        <ChatPanel
          messages={chatMessages}
          loading={loading}
          onScore={handleScore}
          onFix={handleFix}
          onPolish={handlePolish}
          onExport={handleExport}
          polishEnabled={polishEnabled}
          userApiKey={userApiKey}
          publicDemo={publicDemo}
          hasTools={tools.length > 0}
          hasFixedTools={fixedTools.length > 0}
        />
        <ResultsPanel
          scoreResults={scoreResults}
          fixResults={fixResults}
          fixedTools={fixedTools}
          originalTools={tools}
        />
      </div>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <span>Built by{' '}
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" data-testid="linkedin-link">
            Zishan Ali Khan
          </a>
          {' '}· LinkedIn
        </span>
        <span className="app-footer-version">{APP_VERSION}</span>
      </footer>

      {/* ─── About Modal ──────────────────────────────────────────── */}
      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal" data-testid="about-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAbout(false)} aria-label="Close">✕</button>
            <div className="modal-logo-row">
              <img src="/logo.png" alt="Tool Credit Score" className="modal-logo" />
            </div>
            <h2 className="modal-title">Tool Credit Score <span className="modal-title-sub">(for Agents)</span></h2>
            <p className="modal-desc">
              <strong>Why this exists:</strong> Agents fail in production because tool specs are underspecified. This scores your MCP tools and auto-fixes them so agents call tools reliably.<br /><br />
              Optional LLM polish is local-only.
            </p>

            <div className="modal-links">
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="modal-link" data-testid="linkedin-link">
                <span className="modal-link-icon">in</span>
                LinkedIn — Zishan Ali Khan
              </a>
              {GITHUB_URL ? (
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="modal-link">
                  <span className="modal-link-icon">⌘</span>
                  GitHub Repository
                </a>
              ) : (
                <span className="modal-link modal-link-placeholder">
                  <span className="modal-link-icon">⌘</span>
                  GitHub link available after repo publish
                </span>
              )}
            </div>

            <div className="modal-note" style={{ textAlign: 'left' }}>
              <p style={{ marginBottom: '16px' }}>Public demo runs deterministic mode; centralized LLM polish is disabled.</p>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Override with your OpenAI API Key (Local Browser Only):
              </label>
              <input
                type="password"
                value={userApiKey}
                onChange={e => setUserApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="input"
                style={{ width: '100%', backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                data-testid="byok-input"
              />
              <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Your key is stored temporarily in React state and is never saved to disk or database.
                Refresh the page to clear it.
              </p>
            </div>

            <div className="modal-version">{APP_VERSION}</div>
          </div>
        </div>
      )}
    </>
  );
}
