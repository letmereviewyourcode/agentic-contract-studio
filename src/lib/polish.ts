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

Return ONLY a valid JSON object with the following structure:
{
  "explanation": "A brief 1-2 sentence summary of the improvements made.",
  "tool": { ...the improved tool JSON... }
}

Do NOT wrap it in markdown block quotes. Return only the raw JSON string.`;

export async function polishTool(tool: MCPTool, apiKey: string, model: string = 'gpt-4o-mini', baseUrl?: string): Promise<{ tool: MCPTool; explanation: string }> {
    const client = new OpenAI({
        apiKey,
        baseURL: baseUrl || undefined
    });

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
        const parsed = JSON.parse(cleaned);

        // Happy path: LLM followed the wrapper instruction
        if (parsed.tool && parsed.explanation) {
            return { tool: parsed.tool as MCPTool, explanation: parsed.explanation as string };
        }

        // Fallback: LLM hallucinated and just returned the tool directly
        if (parsed.name && parsed.description) {
            return { tool: parsed as MCPTool, explanation: 'Polished descriptions and examples.' };
        }

        throw new Error('Unrecognized JSON structure');
    } catch {
        // Fallback: if LLM returns bad JSON, return the original deterministic tool
        console.warn('LLM returned invalid JSON, falling back to original deterministic tool.');
        return { tool, explanation: 'The LLM returned invalid formatting. The original tool was retained.' };
    }
}

export async function polishTools(tools: MCPTool[], apiKey: string, model: string = 'gpt-4o-mini', baseUrl?: string): Promise<{ polished: MCPTool[]; explanations: string[] }> {
    const results = await Promise.all(tools.map(t => polishTool(t, apiKey, model, baseUrl)));
    return {
        polished: results.map(r => r.tool),
        explanations: results.map(r => `**${r.tool.name}**: ${r.explanation}`)
    };
}

export function isPolishAvailable(): boolean {
    return (
        process.env.PUBLIC_DEMO !== 'true' &&
        process.env.ENABLE_POLISH === 'true' &&
        !!process.env.OPENAI_API_KEY
    );
}
