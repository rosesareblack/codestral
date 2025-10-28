// Core Types for Codestral IDE

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  children?: FileNode[];
  language?: string;
  isOpen?: boolean;
  isDirty?: boolean;
  size?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  files: FileNode[];
  vmId?: string | null;
  createdAt: Date;
  lastModified: Date;
  settings?: any;
  template?: string;
  fileCount?: number;
}

export interface FirecrackerVM {
  id: string;
  workspaceId: string;
  status: 'running' | 'stopped' | 'paused' | 'terminated';
  cpuCount: number;
  memoryMb: number;
  diskSizeGb: number;
  createdAt: Date;
}

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error: string | null;
  executionTime: number;
  timestamp: Date;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  codeBlocks?: CodeBlock[];
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface CollaborationSession {
  id: string;
  workspaceId: string;
  users: CollaborationUser[];
  cursors: Map<string, CursorPosition>;
}

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  status: 'active' | 'idle' | 'disconnected';
}

export interface CursorPosition {
  userId: string;
  filePath: string;
  line: number;
  column: number;
}

export interface TerminalSession {
  id: string;
  vmId: string;
  workspaceId: string;
  isActive: boolean;
}

export interface LSPDiagnostic {
  filePath: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source?: string;
}

export interface DebugSession {
  id: string;
  workspaceId: string;
  breakpoints: Breakpoint[];
  status: 'running' | 'paused' | 'stopped';
  currentLine?: number;
  variables?: Record<string, any>;
}

export interface Breakpoint {
  filePath: string;
  line: number;
  enabled: boolean;
  condition?: string;
}

export interface CodeSearchResult {
  filePath: string;
  line: number;
  column: number;
  snippet: string;
  score: number;
}
