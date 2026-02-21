import OpenAI from 'openai';
import { MCPTool } from './types';

const SYSTEM_PROMPT = `You are an expert MCP (Model Context Protocol) tool specification writer.
Given a tool specification, improve it by:
1. Rewriting the description to be clear, concise, and start with an action verb
2. Improving parameter descriptions to be helpful and unambiguous
3. Adding or improving examples to show realistic usage
4. Maintaining the exact same schema structure and types

Do NOT change core schema semantics (parameter names, types, required fields).
Only improve wording, descriptions, and examples.

Return ONLY the improved tool JSON, no markdown, no explanation.`;

export async function polishTool(tool: MCPTool, apiKey: string, model: string = 'gpt-4o-mini'): Promise<MCPTool> {
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify(tool, null, 2) },
        ],
        temperature: 0.3,
        max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from LLM');

    // Strip potential markdown fencing
    const cleaned = content.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim();

    try {
        return JSON.parse(cleaned) as MCPTool;
    } catch {
        throw new Error('LLM returned invalid JSON');
    }
}

export async function polishTools(tools: MCPTool[], apiKey: string, model: string = 'gpt-4o-mini'): Promise<MCPTool[]> {
    return Promise.all(tools.map(t => polishTool(t, apiKey, model)));
}

export function isPolishAvailable(): boolean {
    return (
        process.env.PUBLIC_DEMO !== 'true' &&
        process.env.ENABLE_POLISH === 'true' &&
        !!process.env.OPENAI_API_KEY
    );
}
