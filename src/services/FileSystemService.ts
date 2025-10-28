import { FileNode } from '@/types';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://dmexmkktelxxnxeckluk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZXhta2t0ZWx4eG54ZWNrbHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Mjk5MjgsImV4cCI6MjA3NzEwNTkyOH0.CiMnJHWNuzqW3q5Y_XQeo-hZz9b7doV95kjFcLF0Wl4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class FileSystemService {
  private cache: Map<string, FileNode> = new Map();
  private currentWorkspaceId: string | null = null;

  setWorkspaceId(workspaceId: string): void {
    this.currentWorkspaceId = workspaceId;
    this.cache.clear(); // Clear cache when switching workspaces
  }

  async createFile(name: string, path: string, content: string = '', language?: string): Promise<FileNode> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    const detectedLanguage = language || this.detectLanguage(name);
    
    try {
      const { data, error } = await supabase
        .from('files')
        .insert({
          workspace_id: this.currentWorkspaceId,
          path,
          content,
          file_type: detectedLanguage,
          size_bytes: content.length
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create file: ${error.message}`);
      }

      const file: FileNode = {
        id: data.id,
        name,
        path,
        type: 'file',
        content,
        language: detectedLanguage,
        isOpen: false,
        isDirty: false,
        size: content.length,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      this.cache.set(path, file);
      return file;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }

  async createFolder(name: string, path: string): Promise<FileNode> {
    // Folders are virtual in our system - we don't store them in the database
    // They are inferred from file paths
    const folder: FileNode = {
      id: `folder-${path}`,
      name,
      path,
      type: 'folder',
      children: [],
    };

    this.cache.set(path, folder);
    return folder;
  }

  async getFile(path: string): Promise<FileNode | undefined> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    // Check cache first
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('workspace_id', this.currentWorkspaceId)
        .eq('path', path)
        .maybeSingle();

      if (error) {
        console.error('Error fetching file:', error);
        return undefined;
      }

      if (!data) {
        return undefined;
      }

      const file: FileNode = {
        id: data.id,
        name: path.split('/').pop() || path,
        path,
        type: 'file',
        content: data.content || '',
        language: data.file_type || 'plaintext',
        isOpen: false,
        isDirty: false,
        size: data.size_bytes || 0,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      this.cache.set(path, file);
      return file;
    } catch (error) {
      console.error('Error getting file:', error);
      return undefined;
    }
  }

  async updateFileContent(path: string, content: string): Promise<void> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    try {
      const { error } = await supabase
        .from('files')
        .update({
          content,
          size_bytes: content.length,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', this.currentWorkspaceId)
        .eq('path', path);

      if (error) {
        throw new Error(`Failed to update file: ${error.message}`);
      }

      // Update cache
      const cachedFile = this.cache.get(path);
      if (cachedFile && cachedFile.type === 'file') {
        cachedFile.content = content;
        cachedFile.isDirty = false;
        cachedFile.size = content.length;
        cachedFile.updatedAt = new Date();
      }
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('workspace_id', this.currentWorkspaceId)
        .eq('path', path);

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      // Remove from cache
      this.cache.delete(path);
      
      // Also remove any child files if this was a folder
      Array.from(this.cache.keys())
        .filter(key => key.startsWith(path + '/'))
        .forEach(key => this.cache.delete(key));

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async renameFile(oldPath: string, newPath: string, newName: string): Promise<boolean> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    try {
      const { error } = await supabase
        .from('files')
        .update({
          path: newPath,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', this.currentWorkspaceId)
        .eq('path', oldPath);

      if (error) {
        throw new Error(`Failed to rename file: ${error.message}`);
      }

      // Update cache
      const file = this.cache.get(oldPath);
      if (file) {
        this.cache.delete(oldPath);
        file.path = newPath;
        file.name = newName;
        file.updatedAt = new Date();
        this.cache.set(newPath, file);
      }

      return true;
    } catch (error) {
      console.error('Error renaming file:', error);
      return false;
    }
  }

  async getAllFiles(): Promise<FileNode[]> {
    if (!this.currentWorkspaceId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('workspace_id', this.currentWorkspaceId)
        .order('path');

      if (error) {
        console.error('Error fetching files:', error);
        return [];
      }

      const files: FileNode[] = data.map(file => ({
        id: file.id,
        name: file.path.split('/').pop() || file.path,
        path: file.path,
        type: 'file' as const,
        content: file.content || '',
        language: file.file_type || 'plaintext',
        isOpen: false,
        isDirty: false,
        size: file.size_bytes || 0,
        createdAt: new Date(file.created_at),
        updatedAt: new Date(file.updated_at)
      }));

      // Update cache
      files.forEach(file => {
        this.cache.set(file.path, file);
      });

      return files;
    } catch (error) {
      console.error('Error getting all files:', error);
      return [];
    }
  }

  buildFileTree(files: FileNode[]): FileNode[] {
    const rootFiles: FileNode[] = [];
    const folderMap = new Map<string, FileNode>();

    // Create folder nodes for all directory paths
    files.forEach(file => {
      const pathParts = file.path.split('/').filter(p => p);
      let currentPath = '';

      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + pathParts[i];
        
        if (!folderMap.has(currentPath)) {
          const folder: FileNode = {
            id: `folder-${currentPath}`,
            name: pathParts[i],
            path: currentPath,
            type: 'folder',
            children: [],
          };
          folderMap.set(currentPath, folder);
        }
      }
    });

    // Build the tree structure
    const allNodes = [...files, ...Array.from(folderMap.values())];
    const nodeMap = new Map<string, FileNode>();

    allNodes.forEach(node => {
      nodeMap.set(node.path, node);
    });

    allNodes.forEach(node => {
      const pathParts = node.path.split('/').filter(p => p);
      
      if (pathParts.length === 1) {
        rootFiles.push(node);
      } else {
        const parentPath = pathParts.slice(0, -1).join('/');
        const parent = nodeMap.get(parentPath);
        
        if (parent && parent.type === 'folder') {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
        }
      }
    });

    // Sort children within each folder
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        // Folders first, then files
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(rootFiles);
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
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'markdown': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'fish': 'shell',
      'dockerfile': 'dockerfile',
      'gitignore': 'text',
      'env': 'text',
      'txt': 'text',
    };
    return languageMap[ext || ''] || 'plaintext';
  }

  async exportWorkspace(): Promise<string> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    try {
      const files = await this.getAllFiles();
      const exportData = {
        workspaceId: this.currentWorkspaceId,
        exportedAt: new Date().toISOString(),
        files: files.map(file => ({
          path: file.path,
          content: file.content,
          language: file.language,
          size: file.size
        }))
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting workspace:', error);
      throw error;
    }
  }

  async importWorkspace(json: string): Promise<FileNode[]> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    try {
      const importData = JSON.parse(json);
      const files: FileNode[] = [];

      if (importData.files && Array.isArray(importData.files)) {
        for (const fileData of importData.files) {
          try {
            const file = await this.createFile(
              fileData.path.split('/').pop() || fileData.path,
              fileData.path,
              fileData.content || '',
              fileData.language
            );
            files.push(file);
          } catch (error) {
            console.warn(`Failed to import file ${fileData.path}:`, error);
          }
        }
      }

      return files;
    } catch (error) {
      console.error('Failed to import workspace:', error);
      throw new Error('Invalid workspace export format');
    }
  }

  // Upload file to Supabase Storage for large files or binary content
  async uploadToStorage(file: File, path: string): Promise<string> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    try {
      const filePath = `${this.currentWorkspaceId}/${path}`;
      
      const { data, error } = await supabase.storage
        .from('file-assets')
        .upload(filePath, file, {
          upsert: true
        });

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('file-assets')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading to storage:', error);
      throw error;
    }
  }

  // Download file from Supabase Storage
  async downloadFromStorage(path: string): Promise<Blob> {
    if (!this.currentWorkspaceId) {
      throw new Error('No workspace selected');
    }

    try {
      const filePath = `${this.currentWorkspaceId}/${path}`;
      
      const { data, error } = await supabase.storage
        .from('file-assets')
        .download(filePath);

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error downloading from storage:', error);
      throw error;
    }
  }

  // Search files by content or name
  async searchFiles(query: string): Promise<FileNode[]> {
    if (!this.currentWorkspaceId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('workspace_id', this.currentWorkspaceId)
        .or(`path.ilike.%${query}%,content.ilike.%${query}%`)
        .order('path');

      if (error) {
        console.error('Error searching files:', error);
        return [];
      }

      return data.map(file => ({
        id: file.id,
        name: file.path.split('/').pop() || file.path,
        path: file.path,
        type: 'file' as const,
        content: file.content || '',
        language: file.file_type || 'plaintext',
        isOpen: false,
        isDirty: false,
        size: file.size_bytes || 0,
        createdAt: new Date(file.created_at),
        updatedAt: new Date(file.updated_at)
      }));
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  // Clear cache (useful when switching workspaces)
  clearCache(): void {
    this.cache.clear();
  }
}

export const fileSystemService = new FileSystemService();