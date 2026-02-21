import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'OPENAI_API_KEY not configured. ChatKit sessions require an API key.' },
            { status: 501 }
        );
    }

    try {
        const body = await req.json().catch(() => ({}));
        const userId = body.userId || 'anonymous';

        const client = new OpenAI({ apiKey });

        // Create a ChatKit session
        // Note: This requires a workflow ID from Agent Builder
        // For now, we return a placeholder that the UI handles gracefully
        try {
            const session = await (client as unknown as { chatkit: { sessions: { create: (opts: unknown) => Promise<{ client_secret: string }> } } }).chatkit.sessions.create({
                user: userId,
            });
            return NextResponse.json({ client_secret: session.client_secret });
        } catch (e) {
            // ChatKit sessions API may not be available — return graceful fallback
            return NextResponse.json(
                { error: `ChatKit session creation failed: ${(e as Error).message}`, fallback: true },
                { status: 503 }
            );
        }
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
