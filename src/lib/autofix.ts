import { MCPTool, MCPToolInputSchema, FixChange, FixResult } from './types';

// ─── Helpers ────────────────────────────────────────────────────────

function toSnakeCase(name: string): string {
    return name
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[-\s.]+/g, '_')
        .toLowerCase()
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');
}

function ensureVerbPrefix(name: string): string {
    const parts = name.split('_');
    const verbs = ['get', 'set', 'create', 'delete', 'update', 'list', 'search', 'find', 'add', 'remove', 'fetch', 'send', 'run', 'execute', 'check', 'validate', 'start', 'stop', 'read', 'write', 'generate', 'compute', 'export', 'import', 'load', 'save'];
    if (parts.length > 0 && verbs.includes(parts[0])) {
        return name;
    }
    // Try to guess a verb: if 2+ parts, maybe it's noun_verb → reorder
    // Default: prepend 'get_'
    return `get_${name}`;
}

function generateDescription(name: string): string {
    const words = name.replace(/_/g, ' ');
    return `Retrieves or performs the ${words} operation. Returns the result of the operation or an error if the operation fails.`;
}

function generateExampleFromSchema(schema: MCPToolInputSchema): Record<string, unknown> {
    const example: Record<string, unknown> = {};
    const props = schema.properties || {};

    for (const [key, param] of Object.entries(props)) {
        switch (param.type) {
            case 'string':
                example[key] = param.enum?.[0] || `example_${key}`;
                break;
            case 'number':
            case 'integer':
                example[key] = 1;
                break;
            case 'boolean':
                example[key] = true;
                break;
            case 'array':
                example[key] = [];
                break;
            case 'object':
                example[key] = {};
                break;
            default:
                example[key] = `example_${key}`;
        }
    }

    return example;
}

function generateParamDescription(key: string, type?: string): string {
    const readable = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase().trim();
    const typeHint = type ? ` (${type})` : '';
    return `The ${readable}${typeHint} to use for this operation.`;
}

// ─── Main Auto-Fix ──────────────────────────────────────────────────

export function fixTool(tool: MCPTool): FixResult {
    const changes: FixChange[] = [];
    const fixed: MCPTool = JSON.parse(JSON.stringify(tool)); // deep clone

    // 1. Fix name: normalize to snake_case
    if (fixed.name) {
        const snaked = toSnakeCase(fixed.name);
        if (snaked !== fixed.name) {
            changes.push({
                field: 'name',
                before: fixed.name,
                after: snaked,
                reason: 'Normalized to snake_case',
            });
            fixed.name = snaked;
        }

        // 2. Ensure verb prefix
        const verbed = ensureVerbPrefix(fixed.name);
        if (verbed !== fixed.name) {
            changes.push({
                field: 'name',
                before: fixed.name,
                after: verbed,
                reason: 'Added verb prefix for clarity',
            });
            fixed.name = verbed;
        }
    }

    // 3. Fix description
    if (!fixed.description || fixed.description.trim() === '') {
        const desc = generateDescription(fixed.name);
        changes.push({
            field: 'description',
            before: '',
            after: desc,
            reason: 'Generated description from tool name',
        });
        fixed.description = desc;
    } else if (!/^[A-Z]/.test(fixed.description.trim())) {
        const capitalized = fixed.description.trim().charAt(0).toUpperCase() + fixed.description.trim().slice(1);
        changes.push({
            field: 'description',
            before: fixed.description,
            after: capitalized,
            reason: 'Capitalized first letter',
        });
        fixed.description = capitalized;
    }

    // 4. Normalize input schema
    // If tool uses 'parameters' but not 'inputSchema', copy to inputSchema
    if (fixed.parameters && !fixed.inputSchema) {
        fixed.inputSchema = { ...fixed.parameters };
        changes.push({
            field: 'inputSchema',
            before: '(used "parameters")',
            after: '(copied to "inputSchema")',
            reason: 'Normalized to standard inputSchema field',
        });
    }

    const schema = fixed.inputSchema;
    if (schema) {
        // Ensure type = "object"
        if (schema.type !== 'object') {
            changes.push({
                field: 'inputSchema.type',
                before: schema.type || '(missing)',
                after: 'object',
                reason: 'Schema type must be "object"',
            });
            schema.type = 'object';
        }

        // Fix parameter types and descriptions
        if (schema.properties) {
            for (const [key, param] of Object.entries(schema.properties)) {
                if (!param.type) {
                    changes.push({
                        field: `inputSchema.properties.${key}.type`,
                        before: '(missing)',
                        after: 'string',
                        reason: 'Added default type "string"',
                    });
                    param.type = 'string';
                }
                if (!param.description) {
                    const desc = generateParamDescription(key, param.type);
                    changes.push({
                        field: `inputSchema.properties.${key}.description`,
                        before: '(missing)',
                        after: desc,
                        reason: 'Generated parameter description',
                    });
                    param.description = desc;
                }
            }

            // Ensure required array exists
            if (!schema.required) {
                const requiredKeys = Object.keys(schema.properties);
                if (requiredKeys.length > 0) {
                    schema.required = requiredKeys;
                    changes.push({
                        field: 'inputSchema.required',
                        before: '(missing)',
                        after: JSON.stringify(requiredKeys),
                        reason: 'Added required array with all parameters',
                    });
                }
            }
        }
    } else {
        // Create empty schema
        fixed.inputSchema = { type: 'object', properties: {}, required: [] };
        changes.push({
            field: 'inputSchema',
            before: '(missing)',
            after: '{ type: "object" }',
            reason: 'Added empty input schema',
        });
    }

    // 5. Add examples if missing
    if (!fixed.examples || !Array.isArray(fixed.examples) || fixed.examples.length === 0) {
        const example = fixed.inputSchema?.properties
            ? generateExampleFromSchema(fixed.inputSchema)
            : {};
        fixed.examples = [example];
        changes.push({
            field: 'examples',
            before: '(missing)',
            after: JSON.stringify([example]),
            reason: 'Generated example from schema',
        });
    }

    // 6. Add annotations if missing
    if (!fixed.annotations || Object.keys(fixed.annotations).length === 0) {
        fixed.annotations = {
            title: fixed.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
        };
        changes.push({
            field: 'annotations',
            before: '(missing)',
            after: JSON.stringify(fixed.annotations),
            reason: 'Added standard MCP annotations',
        });
    }

    return { original: tool, fixed, changes };
}

export function fixTools(tools: MCPTool[]): FixResult[] {
    return tools.map(fixTool);
}
