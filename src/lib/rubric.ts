import {
    MCPTool,
    MCPToolInputSchema,
    Issue,
    ScoreCategory,
    ScoreCategoryName,
    ScoreResult,
    Severity,
} from './types';

// ─── Helpers ────────────────────────────────────────────────────────

let issueCounter = 0;
function makeIssue(
    category: ScoreCategoryName,
    severity: Severity,
    message: string,
    fix?: string
): Issue {
    return { id: `issue-${++issueCounter}`, category, severity, message, fix };
}

function isSnakeCase(s: string): boolean {
    return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(s);
}

function startsWithVerb(s: string): boolean {
    const verbs = [
        'get', 'set', 'create', 'delete', 'update', 'list', 'search',
        'find', 'add', 'remove', 'fetch', 'send', 'run', 'execute',
        'check', 'validate', 'start', 'stop', 'open', 'close',
        'read', 'write', 'enable', 'disable', 'reset', 'generate',
        'compute', 'calculate', 'convert', 'parse', 'format', 'export',
        'import', 'load', 'save', 'upload', 'download', 'sync', 'query',
        'subscribe', 'unsubscribe', 'register', 'deregister', 'publish',
        'notify', 'trigger', 'cancel', 'retry', 'verify', 'approve',
        'reject', 'deploy', 'build', 'test', 'debug', 'log', 'monitor',
        'archive', 'restore', 'merge', 'split', 'connect', 'disconnect',
    ];
    const lower = s.toLowerCase();
    return verbs.some(v => lower.startsWith(v));
}

function getSchema(tool: MCPTool): MCPToolInputSchema | undefined {
    return tool.inputSchema || tool.parameters;
}

// ─── Category Scorers ───────────────────────────────────────────────

function scoreNaming(tool: MCPTool): ScoreCategory {
    const issues: Issue[] = [];
    let deductions = 0;

    if (!tool.name || tool.name.trim() === '') {
        issues.push(makeIssue('naming', 'error', 'Tool name is missing', 'Add a descriptive tool name'));
        deductions += 50;
    } else {
        if (!isSnakeCase(tool.name)) {
            issues.push(makeIssue('naming', 'warning', `Name "${tool.name}" is not snake_case`, `Rename to "${tool.name.replace(/([A-Z])/g, '_$1').replace(/[-\s]+/g, '_').toLowerCase().replace(/^_/, '')}"`));
            deductions += 20;
        }
        if (!startsWithVerb(tool.name.split('_')[0] || tool.name)) {
            issues.push(makeIssue('naming', 'warning', `Name "${tool.name}" does not start with a verb`, 'Prefix with a verb like get_, create_, list_'));
            deductions += 15;
        }
        if (tool.name.length > 64) {
            issues.push(makeIssue('naming', 'warning', `Name "${tool.name}" exceeds 64 characters (${tool.name.length})`, 'Shorten the tool name'));
            deductions += 10;
        }
        if (tool.name.length < 3) {
            issues.push(makeIssue('naming', 'info', `Name "${tool.name}" is very short`, 'Use a more descriptive name'));
            deductions += 5;
        }
    }

    return {
        name: 'naming',
        label: 'Naming',
        score: Math.max(0, 100 - deductions),
        maxScore: 100,
        weight: 0.15,
        issues,
    };
}

function scoreDescription(tool: MCPTool): ScoreCategory {
    const issues: Issue[] = [];
    let deductions = 0;

    if (!tool.description || tool.description.trim() === '') {
        issues.push(makeIssue('description', 'error', 'Description is missing', 'Add a clear, concise description'));
        deductions += 60;
    } else {
        const words = tool.description.trim().split(/\s+/);
        if (words.length < 10) {
            issues.push(makeIssue('description', 'warning', `Description has only ${words.length} words (recommend 10+)`, 'Expand the description with more detail'));
            deductions += 20;
        }
        if (!/^[A-Z]/.test(tool.description.trim())) {
            issues.push(makeIssue('description', 'info', 'Description does not start with a capital letter', 'Capitalize the first letter'));
            deductions += 5;
        }
        const firstWord = words[0]?.toLowerCase() || '';
        const actionVerbs = ['retrieves', 'creates', 'updates', 'deletes', 'lists', 'searches', 'gets', 'sets', 'sends', 'runs', 'executes', 'fetches', 'generates', 'converts', 'validates', 'checks', 'computes', 'parses', 'formats', 'returns'];
        if (!actionVerbs.some(v => firstWord.startsWith(v.slice(0, -1)))) {
            issues.push(makeIssue('description', 'info', 'Description should start with an action verb (e.g. "Retrieves...", "Creates...")', 'Rewrite to start with what the tool does'));
            deductions += 10;
        }
        if (words.length > 200) {
            issues.push(makeIssue('description', 'info', 'Description is very long; consider being more concise', 'Keep description under 200 words'));
            deductions += 5;
        }
    }

    return {
        name: 'description',
        label: 'Description',
        score: Math.max(0, 100 - deductions),
        maxScore: 100,
        weight: 0.25,
        issues,
    };
}

function scoreParameters(tool: MCPTool): ScoreCategory {
    const issues: Issue[] = [];
    let deductions = 0;
    const schema = getSchema(tool);

    if (!schema) {
        issues.push(makeIssue('parameters', 'error', 'No input schema / parameters defined', 'Add an inputSchema with type "object"'));
        deductions += 50;
    } else {
        if (schema.type !== 'object') {
            issues.push(makeIssue('parameters', 'warning', `Schema type is "${schema.type}" instead of "object"`, 'Set type to "object"'));
            deductions += 15;
        }

        const props = schema.properties || {};
        const propKeys = Object.keys(props);

        if (propKeys.length === 0) {
            issues.push(makeIssue('parameters', 'info', 'No parameters defined (tool takes no input)', 'Add parameters if the tool requires input'));
            deductions += 5;
        }

        let missingTypes = 0;
        let missingDescs = 0;

        for (const key of propKeys) {
            const param = props[key];
            if (!param.type) {
                missingTypes++;
            }
            if (!param.description) {
                missingDescs++;
            }
        }

        if (missingTypes > 0) {
            issues.push(makeIssue('parameters', 'error', `${missingTypes} parameter(s) missing "type"`, 'Add type to all parameters'));
            deductions += Math.min(30, missingTypes * 10);
        }
        if (missingDescs > 0) {
            issues.push(makeIssue('parameters', 'warning', `${missingDescs} parameter(s) missing "description"`, 'Add description to all parameters'));
            deductions += Math.min(20, missingDescs * 5);
        }

        if (!schema.required || !Array.isArray(schema.required)) {
            issues.push(makeIssue('parameters', 'warning', 'No "required" array defined', 'Add a required array listing mandatory parameters'));
            deductions += 10;
        } else if (schema.required.length === 0 && propKeys.length > 0) {
            issues.push(makeIssue('parameters', 'info', '"required" array is empty', 'Specify which parameters are required'));
            deductions += 5;
        }
    }

    return {
        name: 'parameters',
        label: 'Parameters',
        score: Math.max(0, 100 - deductions),
        maxScore: 100,
        weight: 0.25,
        issues,
    };
}

function scoreExamples(tool: MCPTool): ScoreCategory {
    const issues: Issue[] = [];
    let deductions = 0;

    if (!tool.examples || !Array.isArray(tool.examples) || tool.examples.length === 0) {
        issues.push(makeIssue('examples', 'warning', 'No examples provided', 'Add at least one example showing typical usage'));
        deductions += 40;
    } else {
        for (let i = 0; i < tool.examples.length; i++) {
            const example = tool.examples[i];
            if (!example || typeof example !== 'object') {
                issues.push(makeIssue('examples', 'warning', `Example ${i + 1} is not a valid object`, 'Ensure each example is a JSON object'));
                deductions += 15;
            }
        }
    }

    return {
        name: 'examples',
        label: 'Examples',
        score: Math.max(0, 100 - deductions),
        maxScore: 100,
        weight: 0.15,
        issues,
    };
}

function scoreBestPractices(tool: MCPTool): ScoreCategory {
    const issues: Issue[] = [];
    let deductions = 0;

    // Check for annotations
    if (!tool.annotations || typeof tool.annotations !== 'object' || Object.keys(tool.annotations).length === 0) {
        issues.push(makeIssue('bestPractices', 'info', 'No annotations defined', 'Add annotations (e.g., readOnlyHint, destructiveHint, idempotentHint)'));
        deductions += 20;
    } else {
        const knownAnnotations = ['title', 'readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint'];
        const hasKnown = knownAnnotations.some(a => a in (tool.annotations || {}));
        if (!hasKnown) {
            issues.push(makeIssue('bestPractices', 'info', 'Annotations exist but none are standard MCP hints', 'Add standard hints like readOnlyHint, destructiveHint'));
            deductions += 10;
        }
    }

    // Check schema has additionalProperties defined
    const schema = getSchema(tool);
    if (schema && schema.properties) {
        if (schema.additionalProperties === undefined) {
            issues.push(makeIssue('bestPractices', 'info', 'Schema does not specify additionalProperties', 'Set additionalProperties: false to restrict extra fields'));
            deductions += 10;
        }
    }

    // Check for return/error schema hints in description
    const desc = (tool.description || '').toLowerCase();
    if (!desc.includes('return') && !desc.includes('error') && !desc.includes('response')) {
        issues.push(makeIssue('bestPractices', 'info', 'Description does not mention return values or error conditions', 'Document what the tool returns and possible errors'));
        deductions += 15;
    }

    return {
        name: 'bestPractices',
        label: 'Best Practices',
        score: Math.max(0, 100 - deductions),
        maxScore: 100,
        weight: 0.20,
        issues,
    };
}

// ─── Grade ──────────────────────────────────────────────────────────

function toGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

// ─── Main Scorer ────────────────────────────────────────────────────

export function scoreTool(tool: MCPTool): ScoreResult {
    issueCounter = 0;

    const categories: ScoreCategory[] = [
        scoreNaming(tool),
        scoreDescription(tool),
        scoreParameters(tool),
        scoreExamples(tool),
        scoreBestPractices(tool),
    ];

    const overallScore = Math.round(
        categories.reduce((sum, cat) => sum + cat.score * cat.weight, 0)
    );

    const issues = categories.flatMap(cat => cat.issues);

    return {
        toolName: tool.name || '(unnamed)',
        overallScore,
        categories,
        issues,
        grade: toGrade(overallScore),
    };
}

export function scoreTools(tools: MCPTool[]): ScoreResult[] {
    return tools.map(scoreTool);
}
