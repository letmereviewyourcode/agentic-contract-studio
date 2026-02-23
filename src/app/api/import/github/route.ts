import { NextRequest, NextResponse } from 'next/server';
import { githubRepoToRawURLs, extractTools } from '@/lib/parser';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
        }

        const rawURLs = githubRepoToRawURLs(url);
        if (rawURLs.length === 0) {
            return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
        }

        // Try each well-known path
        for (const rawUrl of rawURLs) {
            try {
                const res = await fetch(rawUrl, {
                    headers: { Accept: 'application/json' },
                    signal: AbortSignal.timeout(5000),
                });
                if (res.ok) {
                    const data = await res.json();
                    const result = extractTools(data, `github:${rawUrl}`);
                    if (result.success) {
                        return NextResponse.json(result);
                    }
                }
            } catch {
                continue;
            }
        }

        return NextResponse.json(
            { success: false, tools: [], source: `github:${url}`, error: 'Could not find a static JSON tool spec in this repo. v0.1 GitHub import supports repos with tools.json/mcp.json. For dynamic MCP server codebases, use MCP URL import (coming in v0.2).' },
            { status: 404 }
        );
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
