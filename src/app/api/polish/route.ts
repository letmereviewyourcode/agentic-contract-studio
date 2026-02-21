import { NextRequest, NextResponse } from 'next/server';
import { polishTools } from '@/lib/polish';
import { parseToolsFromJSON } from '@/lib/parser';

// Simple in-memory rate limiter (Warning: resets on serverless cold starts)
const rateLimit = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // Max 10 polish requests per minute per IP

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const current = rateLimit.get(ip);
    if (!current || now - current.windowStart > WINDOW_MS) {
        rateLimit.set(ip, { count: 1, windowStart: now });
        return true;
    }
    if (current.count >= MAX_REQUESTS) {
        return false;
    }
    current.count++;
    return true;
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Please wait a minute before trying again.' },
            { status: 429 }
        );
    }

    try {
        const body = await req.json();
        const { tools: rawTools, raw, userApiKey } = body;

        // Resolve which API key to use
        const isPublicDemo = process.env.PUBLIC_DEMO === 'true';
        let apiKey = userApiKey?.trim();

        if (!apiKey) {
            // Fallback to server key only if NOT in public demo AND polish is enabled
            if (isPublicDemo) {
                return NextResponse.json(
                    { ok: false, error: { code: 'POLISH_DISABLED', message: 'Central LLM polish is disabled in the public demo. Provide your own OpenAI API key.' } },
                    { status: 403 }
                );
            }
            if (process.env.ENABLE_POLISH !== 'true') {
                return NextResponse.json(
                    { ok: false, error: { code: 'POLISH_DISABLED', message: 'Polish is disabled in the server configuration.' } },
                    { status: 403 }
                );
            }
            apiKey = process.env.OPENAI_API_KEY;
        }

        if (!apiKey) {
            return NextResponse.json(
                { ok: false, error: { code: 'POLISH_DISABLED', message: 'No OpenAI API key provided or configured.' } },
                { status: 403 }
            );
        }

        let tools = rawTools;
        if (raw && !tools) {
            const result = parseToolsFromJSON(raw);
            if (!result.success) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            tools = result.tools;
        }

        if (!tools || !Array.isArray(tools) || tools.length === 0) {
            return NextResponse.json({ error: 'No tools provided' }, { status: 400 });
        }

        const model = process.env.POLISH_MODEL || 'gpt-4o-mini';
        const polished = await polishTools(tools, apiKey, model);
        return NextResponse.json({ polished });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
