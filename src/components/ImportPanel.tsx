'use client';

import { useState, useRef, useCallback } from 'react';
import type { MCPTool } from '@/lib/types';

const SAMPLE_PASTE = JSON.stringify([
    {
        "name": "searchUsers",
        "description": "search for users",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": { "type": "string" },
                "limit": { "type": "number" },
                "offset": {}
            }
        }
    }
], null, 2);

interface ImportPanelProps {
    onToolsLoaded: (tools: MCPTool[], source: string) => void;
}

export function ImportPanel({ onToolsLoaded }: ImportPanelProps) {
    const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'github' | 'mcp'>('paste');
    const [pasteValue, setPasteValue] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePaste = useCallback(() => {
        if (!pasteValue.trim()) {
            setError('Paste some JSON first');
            return;
        }
        setError(null);
        try {
            const parsed = JSON.parse(pasteValue);
            let tools: MCPTool[];
            if (Array.isArray(parsed)) {
                tools = parsed;
            } else if (parsed.tools && Array.isArray(parsed.tools)) {
                tools = parsed.tools;
            } else if (parsed.name) {
                tools = [parsed];
            } else {
                // Try to find tools in nested arrays
                const found = Object.values(parsed).find(v => Array.isArray(v)) as MCPTool[] | undefined;
                tools = found || [parsed];
            }
            if (tools.length === 0) {
                setError('No valid tools found in JSON');
                return;
            }
            onToolsLoaded(tools, 'Paste JSON');
        } catch (e) {
            setError(`Invalid JSON: ${(e as Error).message}`);
        }
    }, [pasteValue, onToolsLoaded]);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            let tools: MCPTool[];
            if (Array.isArray(parsed)) {
                tools = parsed;
            } else if (parsed.tools && Array.isArray(parsed.tools)) {
                tools = parsed.tools;
            } else if (parsed.name) {
                tools = [parsed];
            } else {
                tools = [parsed];
            }
            onToolsLoaded(tools, `File: ${file.name}`);
        } catch (e) {
            setError(`Error reading file: ${(e as Error).message}`);
        }
    }, [onToolsLoaded]);

    const handleGithubImport = useCallback(async () => {
        if (!githubUrl.trim()) {
            setError('Enter a GitHub repo URL');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const res = await fetch('/api/import/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: githubUrl }),
            });
            const data = await res.json();
            if (!data.success && data.error) {
                setError(data.error);
                return;
            }
            if (data.tools && data.tools.length > 0) {
                onToolsLoaded(data.tools, `GitHub: ${githubUrl}`);
            } else {
                setError('No tools found in the repository');
            }
        } catch (e) {
            setError(`Import failed: ${(e as Error).message}`);
        } finally {
            setLoading(false);
        }
    }, [githubUrl, onToolsLoaded]);

    const loadSample = useCallback(() => {
        setPasteValue(SAMPLE_PASTE);
        setActiveTab('paste');
    }, []);

    const loadSampleFile = useCallback(async () => {
        try {
            const res = await fetch('/examples/tools.json');
            const data = await res.json();
            onToolsLoaded(data, 'Sample: tools.json');
        } catch (e) {
            setError(`Error loading sample: ${(e as Error).message}`);
        }
    }, [onToolsLoaded]);

    return (
        <div className="panel" data-testid="import-panel">
            <div className="panel-header">
                <svg className="panel-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                <h2>Import Tools</h2>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'paste' ? 'active' : ''}`}
                    onClick={() => setActiveTab('paste')}
                    data-testid="tab-paste"
                >
                    📋 Paste JSON
                </button>
                <button
                    className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upload')}
                    data-testid="tab-upload"
                >
                    📁 Upload
                </button>
                <button
                    className={`tab ${activeTab === 'github' ? 'active' : ''}`}
                    onClick={() => setActiveTab('github')}
                    data-testid="tab-github"
                >
                    🐙 GitHub
                </button>
                <button
                    className={`tab ${activeTab === 'mcp' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mcp')}
                    disabled
                    data-testid="tab-mcp"
                >
                    🔌 MCP URL (Coming Soon)
                </button>
            </div>

            <div className="panel-body">
                {error && (
                    <div style={{
                        padding: '10px 14px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '8px',
                        color: 'var(--severity-error)',
                        fontSize: '16px',
                        marginBottom: '12px',
                    }} data-testid="import-error">
                        {error}
                    </div>
                )}

                {activeTab === 'paste' && (
                    <div>
                        <textarea
                            value={pasteValue}
                            onChange={(e) => setPasteValue(e.target.value)}
                            placeholder='Paste your MCP tool JSON here...\n\n{\n  "name": "my_tool",\n  "description": "...",\n  "inputSchema": { ... }\n}'
                            data-testid="paste-input"
                        />
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary" onClick={handlePaste} data-testid="btn-import-paste">
                                Import
                            </button>
                            <button className="btn btn-ghost" onClick={loadSample} data-testid="btn-load-sample">
                                Load Sample
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div>
                        <div
                            className="file-drop-zone"
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="file-drop-zone"
                        >
                            <div style={{ fontSize: '42px', marginBottom: '8px', opacity: 0.4 }}>📄</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
                                Click to upload a <strong>.json</strong> file
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>
                                YAML support <span className="coming-soon">Coming soon</span>
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            data-testid="file-input"
                        />
                    </div>
                )}

                {activeTab === 'github' && (
                    <div>
                        <label style={{ fontSize: '15px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                            Public GitHub Repository URL
                        </label>
                        <input
                            className="input"
                            type="text"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            placeholder="https://github.com/owner/repo"
                            data-testid="github-input"
                        />
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                            Expects a repo containing a static <code style={{ color: 'var(--accent)', fontSize: '13px' }}>tools.json</code> or <code style={{ color: 'var(--accent)', fontSize: '13px' }}>mcp.json</code> spec file in common locations.
                        </p>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleGithubImport}
                                disabled={loading}
                                data-testid="btn-import-github"
                            >
                                {loading ? <><span className="spinner" /> Importing...</> : 'Import from GitHub'}
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={loadSampleFile}
                                data-testid="btn-github-sample"
                            >
                                Try sample
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'mcp' && (
                    <div>
                        <label style={{ fontSize: '15px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                            MCP Server URL
                        </label>
                        <input
                            className="input"
                            type="text"
                            disabled
                            placeholder="Planned for v0.2..."
                            data-testid="mcp-input"
                        />
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }} data-testid="mcp-coming-soon">
                            <span className="coming-soon">Coming soon</span> — Planned for v0.2: connect to a running MCP server and import tool definitions automatically.
                        </p>
                    </div>
                )}

                {/* Sample Buttons */}
                <div style={{ marginTop: '24px' }}>
                    <div className="section-title">Quick Start</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button className="sample-btn" onClick={loadSample} data-testid="sample-paste">
                            📋 Load paste sample (single tool)
                        </button>
                        <button className="sample-btn" onClick={loadSampleFile} data-testid="sample-file">
                            📁 Load sample tools.json (3 tools)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
