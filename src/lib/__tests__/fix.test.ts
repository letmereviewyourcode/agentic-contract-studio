import { describe, it, expect } from 'vitest';
import { fixTool } from '../autofix';
import { MCPTool } from '../types';

describe('fixTool', () => {
    it('normalizes naming to snake_case and adds verb', () => {
        const tool: MCPTool = { name: 'weatherData' };
        const res = fixTool(tool);
        expect(res.fixed.name).toBe('get_weather_data');
        expect(res.changes.some(c => c.field === 'name')).toBe(true);
    });

    it('generates a description if missing', () => {
        const tool: MCPTool = { name: 'get_weather' };
        const res = fixTool(tool);
        expect(res.fixed.description).toBe('Retrieves or performs the get weather operation. Returns the result of the operation or an error if the operation fails.');
    });

    it('creates an empty schema if inputSchema is totally missing', () => {
        const tool: MCPTool = { name: 'get_weather' };
        const res = fixTool(tool);
        expect(res.fixed.inputSchema).toBeDefined();
        expect(res.fixed.inputSchema?.type).toBe('object');
    });

    it('fixes missing parameter types and descriptions', () => {
        const tool: MCPTool = {
            name: 'get_weather',
            inputSchema: {
                type: 'object',
                properties: {
                    location: {} // missing type/desc
                }
            }
        };
        const res = fixTool(tool);
        expect(res.fixed.inputSchema?.properties?.location.type).toBe('string');
        expect(res.fixed.inputSchema?.properties?.location.description).toBeDefined();
    });

    it('adds missing examples from schema', () => {
        const tool: MCPTool = {
            name: 'get_weather',
            inputSchema: {
                type: 'object',
                properties: {
                    location: { type: 'string' }
                }
            }
        };
        const res = fixTool(tool);
        expect(res.fixed.examples).toBeDefined();
        expect(Array.isArray(res.fixed.examples)).toBe(true);
        expect(res.fixed.examples?.[0]).toHaveProperty('location');
    });

    it('adds standard MCP annotations', () => {
        const tool: MCPTool = { name: 'get_weather' };
        const res = fixTool(tool);
        expect(res.fixed.annotations).toBeDefined();
        expect(res.fixed.annotations?.readOnlyHint).toBe(true);
    });
});
