'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ScoreResult, FixResult, MCPTool } from '@/lib/types';

interface ResultsPanelProps {
    scoreResults: ScoreResult[];
    fixResults: FixResult[];
    fixedTools: MCPTool[];
    originalTools: MCPTool[];
}

function getScoreColor(score: number): string {
    if (score >= 90) return 'var(--score-a)';
    if (score >= 80) return 'var(--score-b)';
    if (score >= 70) return 'var(--score-c)';
    if (score >= 60) return 'var(--score-d)';
    return 'var(--score-f)';
}

function getGradeLabel(grade: string): string {
    const labels: Record<string, string> = { A: 'Excellent', B: 'Good', C: 'Fair', D: 'Poor', F: 'Failing' };
    return labels[grade] || grade;
}

export function ResultsPanel({
    scoreResults,
    fixResults,
    fixedTools,
    originalTools,
}: ResultsPanelProps) {
    const [activeView, setActiveView] = useState<'imported' | 'score' | 'issues' | 'diff' | 'json'>('imported');
    const [selectedTool, setSelectedTool] = useState(0);

    const currentResult = scoreResults[selectedTool];
    const allIssues = useMemo(() => scoreResults.flatMap(r => r.issues), [scoreResults]);
    const errorCount = useMemo(() => allIssues.filter(i => i.severity === 'error').length, [allIssues]);
    const warningCount = useMemo(() => allIssues.filter(i => i.severity === 'warning').length, [allIssues]);
    const infoCount = useMemo(() => allIssues.filter(i => i.severity === 'info').length, [allIssues]);

    const handleDownload = useCallback((data: MCPTool[], filename: string) => {
        const exportData = { tools: data };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
        }, 500);
    }, []);

    const diffJson = useMemo(() => {
        if (originalTools.length === 0 || fixedTools.length === 0) return null;
        const originalStr = JSON.stringify(originalTools, null, 2).split('\n');
        const fixedStr = JSON.stringify(fixedTools, null, 2).split('\n');
        const maxLen = Math.max(originalStr.length, fixedStr.length);
        const lines: Array<{ type: 'same' | 'add' | 'remove'; content: string }> = [];
        for (let i = 0; i < maxLen; i++) {
            const orig = originalStr[i] || '';
            const fixed = fixedStr[i] || '';
            if (orig === fixed) {
                lines.push({ type: 'same', content: orig });
            } else {
                if (orig) lines.push({ type: 'remove', content: orig });
                if (fixed) lines.push({ type: 'add', content: fixed });
            }
        }
        return lines;
    }, [originalTools, fixedTools]);

    // Auto-switch tabs based on data availability
    useMemo(() => {
        if (fixedTools.length > 0 && activeView === 'imported') setActiveView('diff');
        else if (scoreResults.length > 0 && activeView === 'imported' && fixedTools.length === 0) setActiveView('score');
        else if (originalTools.length > 0 && scoreResults.length === 0 && activeView !== 'imported') setActiveView('imported');
    }, [originalTools.length, scoreResults.length, fixedTools.length]);

    // Empty state (no tools at all)
    if (originalTools.length === 0) {
        return (
            <div className="panel" data-testid="results-panel">
                <div className="panel-header">
                    <svg className="panel-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <h2>Audit Results</h2>
                </div>
                <div className="empty-state">
                    <div className="empty-state-icon">◇</div>
                    <div className="empty-state-text">
                        Import tools to preview them here. Run <strong>Score</strong> to generate an audit report.
                    </div>
                </div>
            </div>
        );
    }

    const exportWrapper = (tools: MCPTool[]) => ({ tools });

    return (
        <div className="panel" data-testid="results-panel">
            <div className="panel-header">
                <svg className="panel-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <h2>Audit Results</h2>
            </div>

            <div className="tabs">
                <button className={`tab ${activeView === 'imported' ? 'active' : ''}`} onClick={() => setActiveView('imported')} data-testid="results-tab-imported">
                    Imported ({originalTools.length})
                </button>
                {scoreResults.length > 0 && (
                    <>
                        <button className={`tab ${activeView === 'score' ? 'active' : ''}`} onClick={() => setActiveView('score')} data-testid="results-tab-score">
                            Scorecard
                        </button>
                        <button className={`tab ${activeView === 'issues' ? 'active' : ''}`} onClick={() => setActiveView('issues')} data-testid="results-tab-issues">
                            Issues ({allIssues.length})
                        </button>
                    </>
                )}
                {fixedTools.length > 0 && (
                    <>
                        <button className={`tab ${activeView === 'diff' ? 'active' : ''}`} onClick={() => setActiveView('diff')} data-testid="results-tab-diff">
                            Diff
                        </button>
                        <button className={`tab ${activeView === 'json' ? 'active' : ''}`} onClick={() => setActiveView('json')} data-testid="results-tab-json">
                            Fixed JSON
                        </button>
                    </>
                )}
            </div>

            <div className="panel-body">
                {/* Tool Selector for Score View */}
                {activeView === 'score' && scoreResults.length > 1 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        {scoreResults.map((r, i) => (
                            <button
                                key={i}
                                className="tool-badge"
                                onClick={() => setSelectedTool(i)}
                                style={{
                                    opacity: selectedTool === i ? 1 : 0.5,
                                    borderColor: selectedTool === i ? 'var(--accent)' : undefined,
                                }}
                            >
                                {r.toolName}
                            </button>
                        ))}
                    </div>
                )}

                {/* ─── Imported View ──────────────────────────────────────── */}
                {activeView === 'imported' && (
                    <div>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '14px' }}>
                            {originalTools.map((t, i) => (
                                <span key={i} className="tool-badge" style={{ opacity: 0.8, cursor: 'default' }}>
                                    {t.name}
                                </span>
                            ))}
                        </div>
                        <div className="diff-viewer" data-testid="imported-json-viewer">
                            {JSON.stringify(exportWrapper(originalTools), null, 2)}
                        </div>
                    </div>
                )}

                {/* ─── Scorecard View ─────────────────────────────────────── */}
                {activeView === 'score' && currentResult && (
                    <div>
                        {/* Big Score */}
                        <div className="scorecard" data-testid="score-gauge">
                            <div className="scorecard-value" style={{ color: getScoreColor(currentResult.overallScore) }} data-testid="score-value">
                                {currentResult.overallScore}
                            </div>
                            <div className="scorecard-label">out of 100</div>
                            <div
                                className="scorecard-grade"
                                style={{
                                    background: `${getScoreColor(currentResult.overallScore)}18`,
                                    color: getScoreColor(currentResult.overallScore),
                                    border: `1px solid ${getScoreColor(currentResult.overallScore)}30`,
                                }}
                                data-testid="score-grade"
                            >
                                Grade {currentResult.grade} — {getGradeLabel(currentResult.grade)}
                            </div>
                        </div>

                        {/* Issue Summary Strip */}
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'center',
                            padding: '10px 0 16px',
                            borderBottom: '1px solid var(--border)',
                            marginBottom: '16px',
                        }}>
                            {errorCount > 0 && (
                                <span style={{ fontSize: '14px', color: 'var(--red)', fontWeight: 600 }}>
                                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                                </span>
                            )}
                            {warningCount > 0 && (
                                <span style={{ fontSize: '14px', color: 'var(--yellow)', fontWeight: 600 }}>
                                    {warningCount} warning{warningCount !== 1 ? 's' : ''}
                                </span>
                            )}
                            {infoCount > 0 && (
                                <span style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}>
                                    {infoCount} info
                                </span>
                            )}
                            {allIssues.length === 0 && (
                                <span style={{ fontSize: '14px', color: 'var(--green)', fontWeight: 600 }}>
                                    No issues found
                                </span>
                            )}
                        </div>

                        {/* Category Bars */}
                        <div className="section-title">Category Breakdown</div>
                        {currentResult.categories.map(cat => (
                            <div className="category-bar" key={cat.name} data-testid={`category-${cat.name}`}>
                                <div className="category-bar-header">
                                    <span className="category-bar-label">{cat.label} <span style={{ color: 'var(--text-faint)' }}>({Math.round(cat.weight * 100)}%)</span></span>
                                    <span className="category-bar-score" style={{ color: getScoreColor(cat.score) }}>
                                        {cat.score}
                                    </span>
                                </div>
                                <div className="category-bar-track">
                                    <div
                                        className="category-bar-fill"
                                        style={{
                                            width: `${cat.score}%`,
                                            background: getScoreColor(cat.score),
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ─── Issues View (Visual Hero) ──────────────────────────── */}
                {activeView === 'issues' && (
                    <div>
                        {allIssues.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">✓</div>
                                <div className="empty-state-text">All checks passed.</div>
                            </div>
                        ) : (
                            allIssues.map((issue, i) => (
                                <div
                                    key={i}
                                    className={`issue-item sev-${issue.severity}`}
                                    data-testid="issue-item"
                                >
                                    <span className={`issue-badge ${issue.severity}`}>{issue.severity}</span>
                                    <div>
                                        <div className="issue-text">{issue.message}</div>
                                        {issue.fix && <div className="issue-fix">Fix: {issue.fix}</div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ─── Diff View (Visual Hero) ────────────────────────────── */}
                {activeView === 'diff' && diffJson && (
                    <div>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                            {diffJson.filter(l => l.type === 'add').length} additions, {diffJson.filter(l => l.type === 'remove').length} deletions
                        </div>
                        <div className="diff-viewer" data-testid="diff-viewer">
                            {diffJson.map((line, i) => (
                                <div
                                    key={i}
                                    className={`diff-line ${line.type === 'add' ? 'diff-add' : line.type === 'remove' ? 'diff-remove' : ''}`}
                                >
                                    {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}
                                    {line.content}
                                </div>
                            ))}
                        </div>

                        {fixResults.length > 0 && (
                            <>
                                <div className="section-title" style={{ marginTop: 16 }}>Change Log</div>
                                {fixResults.flatMap(r => r.changes).map((change, i) => (
                                    <div key={i} className="change-item">
                                        <div className="change-field">{change.field}</div>
                                        <div className="change-reason">{change.reason}</div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* ─── JSON View ──────────────────────────────────────────── */}
                {activeView === 'json' && fixedTools.length > 0 && (
                    <div>
                        <div className="diff-viewer" data-testid="fixed-json-viewer">
                            {JSON.stringify(exportWrapper(fixedTools), null, 2)}
                        </div>
                    </div>
                )}

                {/* Download Buttons */}
                {(fixedTools.length > 0 || originalTools.length > 0) && (
                    <div className="download-group">
                        {fixedTools.length > 0 && (
                            <button
                                className="btn btn-primary"
                                onClick={() => handleDownload(fixedTools, 'tools-fixed.json')}
                                data-testid="btn-download-fixed"
                                style={{ fontSize: '14px', padding: '7px 12px' }}
                            >
                                Download Fixed
                            </button>
                        )}
                        {originalTools.length > 0 && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleDownload(originalTools, 'tools-original.json')}
                                data-testid="btn-download-original"
                                style={{ fontSize: '14px', padding: '7px 12px' }}
                            >
                                Download Original
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
