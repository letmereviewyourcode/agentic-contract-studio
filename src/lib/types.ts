// ─── MCP Tool Spec Types ────────────────────────────────────────────

export interface MCPToolParameter {
  type?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: MCPToolParameter;
  properties?: Record<string, MCPToolParameter>;
  required?: string[];
  [key: string]: unknown;
}

export interface MCPToolInputSchema {
  type: string;
  properties?: Record<string, MCPToolParameter>;
  required?: string[];
  [key: string]: unknown;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: MCPToolInputSchema;
  parameters?: MCPToolInputSchema;
  annotations?: Record<string, unknown>;
  examples?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

// ─── Scoring Types ──────────────────────────────────────────────────

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  id: string;
  category: ScoreCategoryName;
  severity: Severity;
  message: string;
  fix?: string;
}

export type ScoreCategoryName =
  | 'naming'
  | 'description'
  | 'parameters'
  | 'examples'
  | 'bestPractices';

export interface ScoreCategory {
  name: ScoreCategoryName;
  label: string;
  score: number;       // 0-100
  maxScore: number;    // always 100
  weight: number;      // 0.0-1.0
  issues: Issue[];
}

export interface ScoreResult {
  toolName: string;
  overallScore: number; // 0-100 weighted
  categories: ScoreCategory[];
  issues: Issue[];
  grade: string;        // A, B, C, D, F
}

// ─── Fix Types ──────────────────────────────────────────────────────

export interface FixChange {
  field: string;
  before: string;
  after: string;
  reason: string;
}

export interface FixResult {
  original: MCPTool;
  fixed: MCPTool;
  changes: FixChange[];
}

// ─── Chat Types ─────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    type?: 'score' | 'fix' | 'polish' | 'import' | 'export' | 'info';
    scoreResult?: ScoreResult[];
    fixResult?: FixResult[];
    tools?: MCPTool[];
  };
}

// ─── Import Types ───────────────────────────────────────────────────

export interface ImportResult {
  success: boolean;
  tools: MCPTool[];
  source: string;
  error?: string;
}
