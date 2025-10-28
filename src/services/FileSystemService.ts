import { FileNode } from '@/types';

class FileSystemService {
  private files: Map<string, FileNode> = new Map();
  private fileIdCounter = 0;

  generateId(): string {
    return `file-${Date.now()}-${this.fileIdCounter++}`;
  }

  createFile(name: string, path: string, content: string = '', language: string = 'plaintext'): FileNode {
    const file: FileNode = {
      id: this.generateId(),
      name,
      path,
      type: 'file',
      content,
      language,
      isOpen: false,
      isDirty: false,
    };
    this.files.set(file.path, file);
    return file;
  }

  createFolder(name: string, path: string): FileNode {
    const folder: FileNode = {
      id: this.generateId(),
      name,
      path,
      type: 'folder',
      children: [],
    };
    this.files.set(folder.path, folder);
    return folder;
  }

  getFile(path: string): FileNode | undefined {
    return this.files.get(path);
  }

  updateFileContent(path: string, content: string): void {
    const file = this.files.get(path);
    if (file && file.type === 'file') {
      file.content = content;
      file.isDirty = true;
    }
  }

  deleteFile(path: string): boolean {
    return this.files.delete(path);
  }

  getAllFiles(): FileNode[] {
    return Array.from(this.files.values());
  }

  buildFileTree(files: FileNode[]): FileNode[] {
    const rootFiles: FileNode[] = [];
    const pathMap = new Map<string, FileNode>();

    files.forEach(file => {
      pathMap.set(file.path, file);
    });

    files.forEach(file => {
      const pathParts = file.path.split('/').filter(p => p);
      if (pathParts.length === 1) {
        rootFiles.push(file);
      } else {
        const parentPath = pathParts.slice(0, -1).join('/');
        const parent = pathMap.get(parentPath);
        if (parent && parent.type === 'folder') {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(file);
        }
      }
    });

    return rootFiles;
  }

  detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
    };
    return languageMap[ext || ''] || 'plaintext';
  }

  exportWorkspace(files: FileNode[]): string {
    return JSON.stringify(files, null, 2);
  }

  importWorkspace(json: string): FileNode[] {
    try {
      return JSON.parse(json);
    } catch (error) {
      console.error('Failed to import workspace:', error);
      return [];
    }
  }
}

export const fileSystemService = new FileSystemService();
