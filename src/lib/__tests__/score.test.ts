import { describe, it, expect } from 'vitest';
import { scoreTool } from '../rubric';
import { MCPTool } from '../types';

describe('scoreTool', () => {
    it('scores a perfect tool 100', () => {
        const perf: MCPTool = {
            name: 'get_weather_data',
            description: 'Retrieves weather data for a specific location and date in the requested format. Returns the weather data, or throws an error if location is invalid.',
            inputSchema: {
                type: 'object',
                properties: {
                    location: { type: 'string', description: 'The city name' },
                },
                required: ['location'],
                additionalProperties: false
            },
            examples: [{ location: 'London' }],
            annotations: { readOnlyHint: true }
        };
        const res = scoreTool(perf);
        expect(res.overallScore).toBe(100);
        expect(res.grade).toBe('A');
        expect(res.issues.length).toBe(0);
    });

    it('deducts points for missing descriptions and bad naming', () => {
        const bad: MCPTool = {
            name: 'weather', // Not snake case, no verb
            description: 'weather', // Too short
            inputSchema: {
                type: 'object',
                properties: {
                    location: { type: 'string' } // Missing description
                }
            }
        };
        const res = scoreTool(bad);
        expect(res.overallScore).toBeLessThanOrEqual(70);
        expect(res.issues.length).toBeGreaterThan(0);

        const namingIssues = res.issues.filter(i => i.category === 'naming');
        expect(namingIssues.some(i => i.message.includes('verb'))).toBe(true);
    });
});
