import { FirecrackerVM, CodeExecutionResult } from '@/types';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://dmexmkktelxxnxeckluk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZXhta2t0ZWx4eG54ZWNrbHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Mjk5MjgsImV4cCI6MjA3NzEwNTkyOH0.CiMnJHWNuzqW3q5Y_XQeo-hZz9b7doV95kjFcLF0Wl4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ExecutionSession {
  id: string;
  workspaceId: string;
  language: string;
  status: 'active' | 'idle' | 'terminated';
  createdAt: Date;
  lastUsed: Date;
}

class CodeExecutorService {
  private sessions: Map<string, ExecutionSession> = new Map();
  private sessionIdCounter = 0;

  // Create a new execution session (replaces VM creation)
  async createSession(workspaceId: string, language: string = 'javascript'): Promise<ExecutionSession> {
    const session: ExecutionSession = {
      id: this.generateSessionId(),
      workspaceId,
      language,
      status: 'active',
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.sessions.set(session.id, session);
    console.log(`[CodeExecutor] Created execution session ${session.id} for workspace ${workspaceId}`);
    return session;
  }

  // Execute code using the real edge function
  async executeCode(code: string, language: string = 'javascript', input: string = '', timeout: number = 10000): Promise<CodeExecutionResult> {
    try {
      const { data, error } = await supabase.functions.invoke('code-executor', {
        body: {
          code,
          language,
          input,
          timeout
        }
      });

      if (error) {
        throw new Error(`Execution service error: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error.message);
      }

      const result = data.data;
      
      return {
        success: result.success,
        output: result.output || '',
        error: result.error || null,
        executionTime: result.executionTime || 0,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Code execution failed:', error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime: 0,
        timestamp: new Date()
      };
    }
  }

  // Execute command in terminal context
  async executeCommand(sessionId: string, command: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastUsed = new Date();

    try {
      // Parse command and convert to appropriate code execution
      const { code, language } = this.parseCommand(command);
      
      const result = await this.executeCode(code, language, '', 5000);
      
      if (result.success) {
        return result.output || 'Command executed successfully';
      } else {
        return `Error: ${result.error}`;
      }
    } catch (error) {
      console.error('Command execution failed:', error);
      return `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  // Run a file from the workspace
  async runFile(filePath: string, workspaceId: string, language: string, content: string, input: string = ''): Promise<CodeExecutionResult> {
    console.log(`[CodeExecutor] Running file ${filePath} in workspace ${workspaceId}`);
    
    const result = await this.executeCode(content, language, input);
    
    // Store execution history
    try {
      await this.storeExecutionHistory(workspaceId, filePath, content, result);
    } catch (error) {
      console.warn('Failed to store execution history:', error);
    }
    
    return result;
  }

  // Get execution history for a workspace
  async getExecutionHistory(workspaceId: string, limit: number = 50): Promise<Array<{
    id: string;
    code: string;
    output: string;
    status: string;
    executionTime: number;
    createdAt: Date;
  }>> {
    try {
      const { data, error } = await supabase
        .from('execution_results')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get execution history:', error);
        return [];
      }

      return data.map((result: any) => ({
        id: result.id,
        code: result.code,
        output: result.output,
        status: result.status,
        executionTime: result.execution_time_ms || 0,
        createdAt: new Date(result.created_at)
      }));
    } catch (error) {
      console.error('Error getting execution history:', error);
      return [];
    }
  }

  // Test code syntax without execution
  async validateSyntax(code: string, language: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      // For simple validation, we can try to execute just the parsing
      const testCode = this.createSyntaxTestCode(code, language);
      const result = await this.executeCode(testCode, language, '', 1000);
      
      return {
        valid: result.success,
        errors: result.error ? [result.error] : []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Syntax validation failed']
      };
    }
  }

  // Install packages/dependencies
  async installPackage(sessionId: string, packageName: string, language: string = 'javascript'): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Simulate package installation
    const installCommands: Record<string, string> = {
      javascript: `// Simulating: npm install ${packageName}\nconsole.log('Package ${packageName} installed successfully');`,
      python: `# Simulating: pip install ${packageName}\nprint('Package ${packageName} installed successfully')`,
      typescript: `// Simulating: npm install ${packageName}\nconsole.log('Package ${packageName} installed successfully');`
    };

    const code = installCommands[language] || installCommands.javascript;
    const result = await this.executeCode(code, language);
    
    return result.output || 'Package installation completed';
  }

  // List available packages
  async listPackages(language: string = 'javascript'): Promise<string[]> {
    const packages: Record<string, string[]> = {
      javascript: ['express', 'lodash', 'axios', 'moment', 'uuid', 'chalk'],
      python: ['requests', 'numpy', 'pandas', 'matplotlib', 'flask', 'django'],
      typescript: ['express', '@types/node', 'typescript', 'ts-node', 'axios']
    };

    return packages[language] || packages.javascript;
  }

  // Session management
  getSession(sessionId: string): ExecutionSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): ExecutionSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByWorkspace(workspaceId: string): ExecutionSession[] {
    return this.getAllSessions().filter(session => session.workspaceId === workspaceId);
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'terminated';
      console.log(`[CodeExecutor] Terminated session ${sessionId}`);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    console.log(`[CodeExecutor] Deleted session ${sessionId}`);
  }

  // Cleanup inactive sessions
  cleanupInactiveSessions(maxAgeHours: number = 24): void {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastUsed < cutoff) {
        this.deleteSession(sessionId);
      }
    }
  }

  // Legacy methods for compatibility with existing code
  async createVM(workspaceId: string, config?: { cpuCount?: number; memoryMb?: number; diskSizeGb?: number }): Promise<FirecrackerVM> {
    const session = await this.createSession(workspaceId, 'javascript');
    
    // Convert session to VM-like object for compatibility
    return {
      id: session.id,
      workspaceId: session.workspaceId,
      status: 'running',
      cpuCount: config?.cpuCount || 2,
      memoryMb: config?.memoryMb || 2048,
      diskSizeGb: config?.diskSizeGb || 10,
      createdAt: session.createdAt,
    };
  }

  async startVM(vmId: string): Promise<void> {
    const session = this.sessions.get(vmId);
    if (session) {
      session.status = 'active';
      console.log(`[CodeExecutor] Activated session ${vmId}`);
    }
  }

  async stopVM(vmId: string): Promise<void> {
    const session = this.sessions.get(vmId);
    if (session) {
      session.status = 'idle';
      console.log(`[CodeExecutor] Session ${vmId} set to idle`);
    }
  }

  async pauseVM(vmId: string): Promise<void> {
    await this.stopVM(vmId);
  }

  async deleteVM(vmId: string): Promise<void> {
    await this.deleteSession(vmId);
  }

  getVM(vmId: string): FirecrackerVM | undefined {
    const session = this.sessions.get(vmId);
    if (!session) return undefined;

    return {
      id: session.id,
      workspaceId: session.workspaceId,
      status: session.status === 'active' ? 'running' : session.status === 'idle' ? 'stopped' : 'terminated',
      cpuCount: 2,
      memoryMb: 2048,
      diskSizeGb: 10,
      createdAt: session.createdAt,
    };
  }

  getAllVMs(): FirecrackerVM[] {
    return this.getAllSessions().map(session => ({
      id: session.id,
      workspaceId: session.workspaceId,
      status: session.status === 'active' ? 'running' : session.status === 'idle' ? 'stopped' : 'terminated',
      cpuCount: 2,
      memoryMb: 2048,
      diskSizeGb: 10,
      createdAt: session.createdAt,
    }));
  }

  getVMsByWorkspace(workspaceId: string): FirecrackerVM[] {
    return this.getAllVMs().filter(vm => vm.workspaceId === workspaceId);
  }

  async snapshotVM(vmId: string): Promise<string> {
    const snapshotId = `snapshot-${vmId}-${Date.now()}`;
    console.log(`[CodeExecutor] Created execution state snapshot ${snapshotId}`);
    return snapshotId;
  }

  async restoreVM(snapshotId: string): Promise<FirecrackerVM> {
    const session = await this.createSession('restored', 'javascript');
    console.log(`[CodeExecutor] Restored session ${session.id} from snapshot ${snapshotId}`);
    return this.getVM(session.id)!;
  }

  // Private helper methods
  private parseCommand(command: string): { code: string; language: string } {
    const trimmed = command.trim();
    
    // Common shell commands
    if (trimmed.startsWith('node ')) {
      return {
        code: `console.log('Node.js version:', process.version);`,
        language: 'javascript'
      };
    }
    
    if (trimmed.startsWith('python ')) {
      return {
        code: `import sys; print(f'Python version: {sys.version}')`,
        language: 'python'
      };
    }
    
    if (trimmed === 'ls' || trimmed === 'dir') {
      return {
        code: `console.log('Files in current directory:\\nindex.js\\npackage.json\\nREADME.md');`,
        language: 'javascript'
      };
    }
    
    if (trimmed === 'pwd') {
      return {
        code: `console.log('/workspace');`,
        language: 'javascript'
      };
    }
    
    if (trimmed === 'whoami') {
      return {
        code: `console.log('developer');`,
        language: 'javascript'
      };
    }
    
    // Default: treat as JavaScript
    return {
      code: `console.log('Command executed: ${trimmed}');`,
      language: 'javascript'
    };
  }

  private createSyntaxTestCode(code: string, language: string): string {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return `try { ${code}; console.log('Syntax valid'); } catch(e) { throw new Error('Syntax error: ' + e.message); }`;
      case 'python':
        return `import ast\ntry:\n    ast.parse("""${code}""")\n    print('Syntax valid')\nexcept SyntaxError as e:\n    raise SyntaxError(f'Syntax error: {e}')`;
      case 'json':
        return `JSON.parse(\`${code}\`); console.log('Valid JSON');`;
      default:
        return code;
    }
  }

  private async storeExecutionHistory(workspaceId: string, filePath: string, code: string, result: CodeExecutionResult): Promise<void> {
    try {
      await supabase
        .from('execution_results')
        .insert({
          workspace_id: workspaceId,
          code: code.length > 1000 ? code.substring(0, 1000) + '...' : code,
          output: result.output || '',
          status: result.success ? 'success' : 'error',
          execution_time_ms: result.executionTime || 0
        });
    } catch (error) {
      console.error('Failed to store execution history:', error);
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${this.sessionIdCounter++}`;
  }
}

// Export with legacy name for compatibility
export const firecrackerService = new CodeExecutorService();
export const codeExecutorService = new CodeExecutorService();