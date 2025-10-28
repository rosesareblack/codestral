import { Workspace, FileNode } from '@/types';
import { fileSystemService } from './FileSystemService';
import { firecrackerService } from './FirecrackerService';

class WorkspaceService {
  private workspaces: Map<string, Workspace> = new Map();
  private workspaceIdCounter = 0;
  private currentWorkspaceId: string | null = null;

  async createWorkspace(name: string, description: string = '', template?: string): Promise<Workspace> {
    const workspaceId = this.generateWorkspaceId();
    
    // Create initial file structure based on template
    const files = this.createInitialFiles(template);
    
    // Create Firecracker VM for the workspace
    const vm = await firecrackerService.createVM(workspaceId);

    const workspace: Workspace = {
      id: workspaceId,
      name,
      description,
      files,
      vmId: vm.id,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    this.workspaces.set(workspaceId, workspace);
    this.currentWorkspaceId = workspaceId;

    console.log(`[Workspace] Created workspace "${name}" with ID ${workspaceId}`);
    return workspace;
  }

  getWorkspace(workspaceId: string): Workspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  getCurrentWorkspace(): Workspace | undefined {
    return this.currentWorkspaceId ? this.workspaces.get(this.currentWorkspaceId) : undefined;
  }

  setCurrentWorkspace(workspaceId: string): void {
    if (this.workspaces.has(workspaceId)) {
      this.currentWorkspaceId = workspaceId;
    }
  }

  getAllWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (workspace?.vmId) {
      await firecrackerService.deleteVM(workspace.vmId);
    }
    this.workspaces.delete(workspaceId);
    
    if (this.currentWorkspaceId === workspaceId) {
      this.currentWorkspaceId = null;
    }
  }

  updateWorkspace(workspaceId: string, updates: Partial<Workspace>): void {
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      Object.assign(workspace, updates);
      workspace.lastModified = new Date();
    }
  }

  addFileToWorkspace(workspaceId: string, file: FileNode): void {
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      workspace.files.push(file);
      workspace.lastModified = new Date();
    }
  }

  removeFileFromWorkspace(workspaceId: string, filePath: string): void {
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      workspace.files = workspace.files.filter(f => f.path !== filePath);
      workspace.lastModified = new Date();
    }
  }

  async cloneWorkspace(workspaceId: string, newName: string): Promise<Workspace> {
    const sourceWorkspace = this.workspaces.get(workspaceId);
    if (!sourceWorkspace) {
      throw new Error('Source workspace not found');
    }

    // Deep clone files
    const clonedFiles = JSON.parse(JSON.stringify(sourceWorkspace.files));

    return this.createWorkspace(
      newName,
      `Cloned from ${sourceWorkspace.name}`,
      'custom'
    );
  }

  async snapshotWorkspace(workspaceId: string): Promise<string> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const snapshot = {
      workspace,
      timestamp: new Date(),
    };

    const snapshotId = `snapshot-${workspaceId}-${Date.now()}`;
    
    // In a real implementation, this would save to storage
    console.log(`[Workspace] Created snapshot ${snapshotId}`);
    
    if (workspace.vmId) {
      await firecrackerService.snapshotVM(workspace.vmId);
    }

    return snapshotId;
  }

  private createInitialFiles(template?: string): FileNode[] {
    const templates: Record<string, FileNode[]> = {
      javascript: [
        fileSystemService.createFile('package.json', 'package.json', JSON.stringify({
          name: 'my-project',
          version: '1.0.0',
          type: 'module',
          scripts: {
            start: 'node index.js',
            test: 'echo "No tests yet"'
          }
        }, null, 2), 'json'),
        fileSystemService.createFile('index.js', 'index.js', `console.log('Hello, World!');

function main() {
  console.log('Starting application...');
}

main();
`, 'javascript'),
        fileSystemService.createFile('README.md', 'README.md', `# My Project

A new project created with Codestral IDE.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`
`, 'markdown'),
      ],
      typescript: [
        fileSystemService.createFile('package.json', 'package.json', JSON.stringify({
          name: 'my-typescript-project',
          version: '1.0.0',
          scripts: {
            build: 'tsc',
            start: 'node dist/index.js'
          },
          devDependencies: {
            '@types/node': '^20.0.0',
            'typescript': '^5.0.0'
          }
        }, null, 2), 'json'),
        fileSystemService.createFile('tsconfig.json', 'tsconfig.json', JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'commonjs',
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true
          }
        }, null, 2), 'json'),
        fileSystemService.createFile('index.ts', 'src/index.ts', `interface Config {
  name: string;
  version: string;
}

const config: Config = {
  name: 'My TypeScript Project',
  version: '1.0.0'
};

function main(): void {
  console.log(\`Starting \${config.name} v\${config.version}\`);
}

main();
`, 'typescript'),
      ],
      python: [
        fileSystemService.createFile('main.py', 'main.py', `#!/usr/bin/env python3

def main():
    print("Hello, World!")
    print("Starting Python application...")

if __name__ == "__main__":
    main()
`, 'python'),
        fileSystemService.createFile('requirements.txt', 'requirements.txt', `# Add your Python dependencies here
`, 'plaintext'),
        fileSystemService.createFile('README.md', 'README.md', `# Python Project

A new Python project created with Codestral IDE.

## Getting Started

\`\`\`bash
pip install -r requirements.txt
python main.py
\`\`\`
`, 'markdown'),
      ],
    };

    return templates[template || 'javascript'] || templates.javascript;
  }

  private generateWorkspaceId(): string {
    return `ws-${Date.now()}-${this.workspaceIdCounter++}`;
  }
}

export const workspaceService = new WorkspaceService();
