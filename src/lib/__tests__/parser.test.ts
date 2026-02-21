import { describe, it, expect } from 'vitest';
import { extractTools } from '../parser';
import { MCPTool } from '../types';

describe('parser - extractTools', () => {
    const validTool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: { type: 'object', properties: {} }
    };

    it('extracts a single object', () => {
        const result = extractTools(validTool, 'test');
        expect(result.success).toBe(true);
        expect(result.tools).toHaveLength(1);
        expect(result.tools[0].name).toBe('test_tool');
    });

    it('extracts an array of objects', () => {
        const result = extractTools([validTool, validTool], 'test');
        expect(result.success).toBe(true);
        expect(result.tools).toHaveLength(2);
    });

    it('extracts from a wrapper { tools: [...] }', () => {
        const result = extractTools({ tools: [validTool] }, 'test');
        expect(result.success).toBe(true);
        expect(result.tools).toHaveLength(1);
    });

    it('extracts from OpenAI format { functions: [...] }', () => {
        const result = extractTools({ functions: [validTool] }, 'test');
        expect(result.success).toBe(true);
        expect(result.tools).toHaveLength(1);
    });

    it('fails on invalid input without a name string', () => {
        const result = extractTools({ name: 123 }, 'test');
        expect(result.success).toBe(false);
        expect(result.tools).toHaveLength(0);
    });
});
