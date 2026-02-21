'use client';

import { useRef, useEffect, useState } from 'react';

interface ChatPanelProps {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    loading: string | null;
    onScore: () => void;
    onFix: () => void;
    onPolish: () => void;
    onExport: () => void;
    polishEnabled: boolean;
    userApiKey: string;
    publicDemo: boolean;
    hasTools: boolean;
    hasFixedTools: boolean;
}

function renderMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(91,164,164,0.1);padding:1px 4px;border-radius:3px;font-family:JetBrains Mono,monospace;font-size:11px;color:var(--accent)">$1</code>')
        .replace(/\n/g, '<br/>');
}

export function ChatPanel({
    messages,
    loading,
    onScore,
    onFix,
    onPolish,
    onExport,
    polishEnabled,
    userApiKey,
    publicDemo,
    hasTools,
    hasFixedTools,
}: ChatPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [chatkitReady, setChatkitReady] = useState(false);

    useEffect(() => {
        fetch('/api/chatkit/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
            .then(r => { if (r.ok) setChatkitReady(true); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const isPolishReady = polishEnabled || userApiKey.trim().length > 0;
    const polishDisabledReason = !isPolishReady
        ? 'Provide your OpenAI-compatible API key in the About menu to enable LLM polish.'
        : null;

    return (
        <div className="panel" data-testid="chat-panel">
            <div className="panel-header">
                <svg className="panel-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <h2>Agent Contract Studio</h2>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {chatkitReady && (
                        <span className="status-pill status-live">ChatKit Live</span>
                    )}
                    {!chatkitReady && (
                        <span className="status-pill status-local">Local Mode</span>
                    )}
                </div>
            </div>

            <div className="chat-messages" ref={scrollRef} data-testid="chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.role}`}>
                        <div className={`chat-message-avatar ${msg.role}`}>
                            {msg.role === 'assistant' ? '⚡' : '▸'}
                        </div>
                        <div
                            className="chat-message-bubble"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                    </div>
                ))}

                {loading && (
                    <div className="chat-message assistant">
                        <div className="chat-message-avatar assistant">⚡</div>
                        <div className="chat-message-bubble">
                            <span className="loading-dots">
                                <span>●</span> <span>●</span> <span>●</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="chat-actions" data-testid="chat-actions">
                <button
                    className="btn btn-primary"
                    onClick={onScore}
                    disabled={!hasTools || loading === 'score'}
                    data-testid="score-button"
                >
                    {loading === 'score' ? <><span className="spinner" /> Scoring...</> : 'Score'}
                </button>
                <button
                    className="btn btn-success"
                    onClick={onFix}
                    disabled={!hasTools || loading === 'fix'}
                    data-testid="fix-button"
                >
                    {loading === 'fix' ? <><span className="spinner" /> Fixing...</> : 'Auto-Fix'}
                </button>
                <div className="tooltip-wrapper">
                    <button
                        className="btn btn-warning"
                        onClick={onPolish}
                        disabled={!isPolishReady || !hasTools || loading === 'polish'}
                        data-testid="polish-button"
                        title={polishDisabledReason || undefined}
                    >
                        {loading === 'polish' ? <><span className="spinner" /> Polishing...</> : 'Polish with LLM (BYOK)'}
                    </button>
                    {polishDisabledReason && (
                        <span className="tooltip-text" data-testid="polish-tooltip">
                            {polishDisabledReason}
                        </span>
                    )}
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={onExport}
                    disabled={!hasFixedTools}
                    data-testid="export-json-button"
                >
                    Export Fixed JSON
                </button>
            </div>
        </div>
    );
}
