import { NextRequest, NextResponse } from 'next/server';
import { scoreTools } from '@/lib/rubric';
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

        const results = scoreTools(tools);
        return NextResponse.json({ results });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
