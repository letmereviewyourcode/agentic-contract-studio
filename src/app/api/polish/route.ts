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
            { error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Please wait a minute before trying again.' } },
            { status: 429 }
        );
    }

    try {
        const body = await req.json();
        const { tools: rawTools, raw, userApiKey, userBaseUrl, userModel } = body;

        // Resolve which API key to use
        const isPublicDemo = process.env.PUBLIC_DEMO === 'true';
        let apiKey = userApiKey?.trim();

        if (!apiKey) {
            // Fallback to server key only if NOT in public demo AND polish is enabled
            if (isPublicDemo) {
                return NextResponse.json(
                    { ok: false, error: { code: 'MISSING_API_KEY', message: 'Central LLM polish is disabled in the public demo. Provide your own OpenAI-compatible API key.' } },
                    { status: 400 }
                );
            }
            if (process.env.ENABLE_POLISH !== 'true') {
                return NextResponse.json(
                    { ok: false, error: { code: 'MISSING_API_KEY', message: 'Polish is disabled in the server configuration.' } },
                    { status: 400 }
                );
            }
            apiKey = process.env.OPENAI_API_KEY;
        }

        if (!apiKey) {
            return NextResponse.json(
                { ok: false, error: { code: 'MISSING_API_KEY', message: 'No OpenAI API key provided or configured.' } },
                { status: 400 }
            );
        }

        let tools = rawTools;
        if (raw && !tools) {
            const result = parseToolsFromJSON(raw);
            if (!result.success) {
                return NextResponse.json({ error: { code: 'BAD_REQUEST', message: result.error } }, { status: 400 });
            }
            tools = result.tools;
        }

        if (!tools || !Array.isArray(tools) || tools.length === 0) {
            return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'No tools provided' } }, { status: 400 });
        }

        let model = userModel?.trim() || process.env.POLISH_MODEL || 'gpt-4o-mini';
        let baseUrl = userBaseUrl?.trim() || undefined;

        // Auto-detect Gemini keys (they start with AIza) and apply default Google endpoint
        // if the user didn't explicitly provide a custom base URL.
        if (apiKey.startsWith('AIza') && !userBaseUrl?.trim()) {
            baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/';
            if (!userModel?.trim()) {
                model = 'gemini-2.5-flash';
            }
        }

        const { polished, explanations } = await polishTools(tools, apiKey, model, baseUrl);
        return NextResponse.json({ polished, explanation: explanations.join('\n\n') });
    } catch (e) {
        // Obfuscate upstream errors safely
        console.error('Upstream LLM error:', e);
        return NextResponse.json(
            { error: { code: 'UPSTREAM_ERROR', message: 'Upstream LLM error. Please check your configuration (Key, Base URL, or Model).' } },
            { status: 502 }
        );
    }
}
