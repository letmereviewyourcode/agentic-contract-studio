import { NextRequest, NextResponse } from 'next/server';
import { fixTools } from '@/lib/autofix';
import { parseToolsFromJSON } from '@/lib/parser';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tools: rawTools, raw } = body;

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

        const results = fixTools(tools);
        return NextResponse.json({
            fixed: results.map(r => r.fixed),
            changes: results.flatMap(r => r.changes),
            details: results,
        });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
