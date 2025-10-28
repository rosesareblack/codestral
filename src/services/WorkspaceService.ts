import { Workspace, FileNode } from '@/types';
import { fileSystemService } from './FileSystemService';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://dmexmkktelxxnxeckluk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZXhta2t0ZWx4eG54ZWNrbHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Mjk5MjgsImV4cCI6MjA3NzEwNTkyOH0.CiMnJHWNuzqW3q5Y_XQeo-hZz9b7doV95kjFcLF0Wl4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class WorkspaceService {
  private currentWorkspaceId: string | null = null;
  private cache: Map<string, Workspace> = new Map();

  async createWorkspace(name: string, description: string = '', template: string = 'blank'): Promise<Workspace> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('workspace-manager', {
        body: {
          action: 'createWorkspace',
          name,
          description,
          template,
          settings: {
            theme: 'dark',
            autoSave: true,
            fontSize: 14,
            tabSize: 2
          }
        }
      });

      if (error) {
        throw new Error(`Failed to create workspace: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error.message);
      }

      const workspaceData = data.data.workspace;
      const workspace: Workspace = {
        id: workspaceData.id,
        name: workspaceData.name,
        description: workspaceData.description || '',
        files: [], // Files will be loaded separately
        vmId: null, // VM concept replaced with edge functions
        createdAt: new Date(workspaceData.created_at),
        lastModified: new Date(workspaceData.last_modified || workspaceData.created_at),
        settings: workspaceData.settings ? JSON.parse(workspaceData.settings) : {},
        template: workspaceData.template
      };

      // Set this as current workspace and configure file system
      this.currentWorkspaceId = workspace.id;
      fileSystemService.setWorkspaceId(workspace.id);

      // Load the initial files created by the template
      workspace.files = await fileSystemService.getAllFiles();

      this.cache.set(workspace.id, workspace);

      console.log(`[Workspace] Created workspace "${name}" with ID ${workspace.id}`);
      return workspace;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | undefined> {
    // Check cache first
    if (this.cache.has(workspaceId)) {
      return this.cache.get(workspaceId);
    }

    try {
      const { data, error } = await supabase.functions.invoke('workspace-manager', {
        body: {
          action: 'getWorkspace',
          workspaceId
        }
      });

      if (error) {
        console.error('Error getting workspace:', error);
        return undefined;
      }

      if (data?.error) {
        console.error('Workspace error:', data.error);
        return undefined;
      }

      const workspaceData = data.data.workspace;
      const workspace: Workspace = {
        id: workspaceData.id,
        name: workspaceData.name,
        description: workspaceData.description || '',
        files: [], // Will be loaded from file system
        vmId: null,
        createdAt: new Date(workspaceData.created_at),
        lastModified: new Date(workspaceData.last_modified || workspaceData.created_at),
        settings: workspaceData.settings ? JSON.parse(workspaceData.settings) : {},
        template: workspaceData.template
      };

      // Load files for this workspace
      const currentWorkspace = this.currentWorkspaceId;
      fileSystemService.setWorkspaceId(workspace.id);
      workspace.files = await fileSystemService.getAllFiles();
      
      // Restore previous workspace context if different
      if (currentWorkspace && currentWorkspace !== workspace.id) {
        fileSystemService.setWorkspaceId(currentWorkspace);
      }

      this.cache.set(workspace.id, workspace);
      return workspace;
    } catch (error) {
      console.error('Error getting workspace:', error);
      return undefined;
    }
  }

  getCurrentWorkspace(): Workspace | undefined {
    return this.currentWorkspaceId ? this.cache.get(this.currentWorkspaceId) : undefined;
  }

  async setCurrentWorkspace(workspaceId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (workspace) {
        this.currentWorkspaceId = workspaceId;
        fileSystemService.setWorkspaceId(workspaceId);
        
        // Refresh files for the current workspace
        workspace.files = await fileSystemService.getAllFiles();
        this.cache.set(workspaceId, workspace);
        
        console.log(`[Workspace] Switched to workspace "${workspace.name}"`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting current workspace:', error);
      return false;
    }
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    try {
      const { data, error } = await supabase.functions.invoke('workspace-manager', {
        body: {
          action: 'listWorkspaces'
        }
      });

      if (error) {
        console.error('Error listing workspaces:', error);
        return [];
      }

      if (data?.error) {
        console.error('Workspace listing error:', data.error);
        return [];
      }

      const workspaces: Workspace[] = data.data.workspaces.map((ws: any) => ({
        id: ws.id,
        name: ws.name,
        description: ws.description || '',
        files: [], // Files loaded on demand
        vmId: null,
        createdAt: new Date(ws.created_at),
        lastModified: new Date(ws.last_modified || ws.created_at),
        settings: ws.settings ? JSON.parse(ws.settings) : {},
        template: ws.template,
        fileCount: ws.file_count || 0
      }));

      // Update cache
      workspaces.forEach(ws => {
        this.cache.set(ws.id, ws);
      });

      return workspaces;
    } catch (error) {
      console.error('Error getting all workspaces:', error);
      return [];
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('workspace-manager', {
        body: {
          action: 'deleteWorkspace',
          workspaceId
        }
      });

      if (error) {
        throw new Error(`Failed to delete workspace: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error.message);
      }

      // Remove from cache
      this.cache.delete(workspaceId);
      
      // Clear current workspace if it was deleted
      if (this.currentWorkspaceId === workspaceId) {
        this.currentWorkspaceId = null;
        fileSystemService.clearCache();
      }

      console.log(`[Workspace] Deleted workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  }

  async updateWorkspace(workspaceId: string, updates: { name?: string; description?: string; settings?: any }): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('workspace-manager', {
        body: {
          action: 'updateWorkspace',
          workspaceId,
          ...updates
        }
      });

      if (error) {
        throw new Error(`Failed to update workspace: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error.message);
      }

      // Update cache
      const cachedWorkspace = this.cache.get(workspaceId);
      if (cachedWorkspace) {
        Object.assign(cachedWorkspace, updates);
        cachedWorkspace.lastModified = new Date();
      }

      console.log(`[Workspace] Updated workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  }

  async addFileToWorkspace(workspaceId: string, file: FileNode): Promise<void> {
    const workspace = this.cache.get(workspaceId);
    if (workspace) {
      workspace.files.push(file);
      workspace.lastModified = new Date();
    }
  }

  async removeFileFromWorkspace(workspaceId: string, filePath: string): Promise<void> {
    const workspace = this.cache.get(workspaceId);
    if (workspace) {
      workspace.files = workspace.files.filter(f => f.path !== filePath);
      workspace.lastModified = new Date();
    }
  }

  async cloneWorkspace(workspaceId: string, newName: string): Promise<Workspace> {
    try {
      const sourceWorkspace = await this.getWorkspace(workspaceId);
      if (!sourceWorkspace) {
        throw new Error('Source workspace not found');
      }

      // Create new workspace
      const newWorkspace = await this.createWorkspace(
        newName,
        `Cloned from ${sourceWorkspace.name}`,
        sourceWorkspace.template || 'blank'
      );

      // Copy all files from source workspace
      const previousWorkspace = this.currentWorkspaceId;
      fileSystemService.setWorkspaceId(workspaceId);
      const sourceFiles = await fileSystemService.getAllFiles();
      
      fileSystemService.setWorkspaceId(newWorkspace.id);
      
      for (const file of sourceFiles) {
        if (file.type === 'file') {
          await fileSystemService.createFile(
            file.name,
            file.path,
            file.content || '',
            file.language
          );
        }
      }

      // Restore previous workspace context
      if (previousWorkspace) {
        fileSystemService.setWorkspaceId(previousWorkspace);
      }

      // Refresh files in new workspace
      newWorkspace.files = await fileSystemService.getAllFiles();

      console.log(`[Workspace] Cloned workspace "${sourceWorkspace.name}" to "${newName}"`);
      return newWorkspace;
    } catch (error) {
      console.error('Error cloning workspace:', error);
      throw error;
    }
  }

  async snapshotWorkspace(workspaceId: string, name?: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('workspace-manager', {
        body: {
          action: 'createSnapshot',
          workspaceId,
          name: name || `Snapshot ${new Date().toLocaleString()}`
        }
      });

      if (error) {
        throw new Error(`Failed to create snapshot: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error.message);
      }

      console.log(`[Workspace] Created snapshot for workspace ${workspaceId}`);
      return data.data.snapshotId;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }

  async listSnapshots(workspaceId: string): Promise<Array<{ id: string; name: string; createdAt: Date; size: number }>> {
    try {
      const { data, error } = await supabase.functions.invoke('workspace-manager', {
        body: {
          action: 'listSnapshots',
          workspaceId
        }
      });

      if (error) {
        throw new Error(`Failed to list snapshots: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error.message);
      }

      return data.data.snapshots.map((snapshot: any) => ({
        id: snapshot.id,
        name: snapshot.name,
        createdAt: new Date(snapshot.createdAt),
        size: snapshot.size || 0
      }));
    } catch (error) {
      console.error('Error listing snapshots:', error);
      return [];
    }
  }

  async restoreSnapshot(workspaceId: string, snapshotId: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('workspace-manager', {
        body: {
          action: 'restoreSnapshot',
          workspaceId,
          snapshotId
        }
      });

      if (error) {
        throw new Error(`Failed to restore snapshot: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(data.error.message);
      }

      // Clear cache and reload workspace
      this.cache.delete(workspaceId);
      if (this.currentWorkspaceId === workspaceId) {
        fileSystemService.clearCache();
        await this.setCurrentWorkspace(workspaceId);
      }

      console.log(`[Workspace] Restored snapshot ${snapshotId} for workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error restoring snapshot:', error);
      throw error;
    }
  }

  // Real-time workspace collaboration
  async subscribeToWorkspaceChanges(workspaceId: string, callback: (change: any) => void): Promise<() => void> {
    const channel = supabase
      .channel(`workspace-${workspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'files',
        filter: `workspace_id=eq.${workspaceId}`
      }, callback)
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Import/Export functionality
  async exportWorkspace(workspaceId: string): Promise<string> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const previousWorkspace = this.currentWorkspaceId;
      fileSystemService.setWorkspaceId(workspaceId);
      const exportData = await fileSystemService.exportWorkspace();
      
      if (previousWorkspace && previousWorkspace !== workspaceId) {
        fileSystemService.setWorkspaceId(previousWorkspace);
      }

      return exportData;
    } catch (error) {
      console.error('Error exporting workspace:', error);
      throw error;
    }
  }

  async importWorkspace(workspaceData: string, name: string): Promise<Workspace> {
    try {
      // Create new workspace
      const workspace = await this.createWorkspace(name, 'Imported workspace', 'blank');
      
      // Import files
      await fileSystemService.importWorkspace(workspaceData);
      
      // Refresh workspace files
      workspace.files = await fileSystemService.getAllFiles();
      this.cache.set(workspace.id, workspace);

      console.log(`[Workspace] Imported workspace "${name}"`);
      return workspace;
    } catch (error) {
      console.error('Error importing workspace:', error);
      throw error;
    }
  }

  // Get workspace statistics
  async getWorkspaceStats(workspaceId: string): Promise<{
    fileCount: number;
    totalSize: number;
    lastActivity: Date;
    languages: string[];
  }> {
    try {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const files = workspace.files;
      const languages = Array.from(new Set(files.map(f => f.language).filter(Boolean)));
      const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

      return {
        fileCount: files.length,
        totalSize,
        lastActivity: workspace.lastModified,
        languages
      };
    } catch (error) {
      console.error('Error getting workspace stats:', error);
      return {
        fileCount: 0,
        totalSize: 0,
        lastActivity: new Date(),
        languages: []
      };
    }
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.cache.clear();
    fileSystemService.clearCache();
  }
}

export const workspaceService = new WorkspaceService();