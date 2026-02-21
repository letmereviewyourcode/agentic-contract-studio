import { MCPTool, ImportResult } from './types';

/**
 * Parse raw JSON text into an array of MCPTool objects.
 * Supports:
 *   - Single tool object: { name: "...", ... }
 *   - Array of tools:     [{ name: "..." }, ...]
 *   - Wrapper object:     { tools: [...] }
 *   - OpenAPI-ish:        { paths: {...} } → extract operations
 */
export function parseToolsFromJSON(raw: string): ImportResult {
    try {
        const parsed = JSON.parse(raw);
        return extractTools(parsed, 'paste');
    } catch (e) {
        return {
            success: false,
            tools: [],
            source: 'paste',
            error: `Invalid JSON: ${(e as Error).message}`,
        };
    }
}

export function extractTools(parsed: unknown, source: string): ImportResult {
    // Array of tools
    if (Array.isArray(parsed)) {
        const tools = parsed.filter(isTool);
        if (tools.length === 0) {
            return { success: false, tools: [], source, error: 'Array contains no valid tool objects' };
        }
        return { success: true, tools, source };
    }

    // Single object
    if (typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as Record<string, unknown>;

        // { tools: [...] }
        if (Array.isArray(obj.tools)) {
            const tools = (obj.tools as unknown[]).filter(isTool);
            if (tools.length === 0) {
                return { success: false, tools: [], source, error: '"tools" array contains no valid tool objects' };
            }
            return { success: true, tools, source };
        }

        // { functions: [...] } (OpenAI format)
        if (Array.isArray(obj.functions)) {
            const tools = (obj.functions as unknown[]).filter(isTool);
            return { success: true, tools, source };
        }

        // Single tool
        if (isTool(obj)) {
            return { success: true, tools: [obj as MCPTool], source };
        }

        // Try nested — look for any array field that contains tools
        for (const value of Object.values(obj)) {
            if (Array.isArray(value)) {
                const tools = value.filter(isTool);
                if (tools.length > 0) {
                    return { success: true, tools, source };
                }
            }
        }

        return { success: false, tools: [], source, error: 'Object does not contain recognizable tool definitions' };
    }

    return { success: false, tools: [], source, error: 'Input is not a valid JSON object or array' };
}

function isTool(obj: unknown): obj is MCPTool {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    // Must have a 'name' field (string)
    return typeof o.name === 'string' && o.name.trim().length > 0;
}

/**
 * Well-known file paths to search in a GitHub repo for MCP tools.
 */
export const GITHUB_TOOL_PATHS = [
    'mcp.json',
    'tools.json',
    'openapi.json',
    '.well-known/mcp.json',
    'src/mcp.json',
    'config/tools.json',
    'api/tools.json',
];

/**
 * Convert a GitHub repo URL to raw content URLs for well-known tool paths.
 */
export function githubRepoToRawURLs(repoUrl: string): string[] {
    // Accept: https://github.com/owner/repo or https://github.com/owner/repo/...
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return [];

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, '');
    const base = `https://raw.githubusercontent.com/${owner}/${repo}/main`;

    return GITHUB_TOOL_PATHS.map(p => `${base}/${p}`);
}
