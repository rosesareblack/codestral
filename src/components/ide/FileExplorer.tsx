import React, { useState, useEffect, useCallback } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { FileNode, Workspace } from '@/types';
import { workspaceService } from '@/services/WorkspaceService';
import { fileSystemService } from '@/services/FileSystemService';
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  FileText,
  FolderPlus,
  Trash2,
  Edit2,
  MoreHorizontal,
} from 'lucide-react';

interface FileExplorerProps {
  workspace: Workspace;
  onFileSelect: (file: FileNode) => void;
  onFileOpen?: (file: FileNode) => void;
}

interface TreeNodeProps {
  node: FileNode;
  level: number;
  onFileSelect?: (file: FileNode) => void;
  onFileOpen?: (file: FileNode) => void;
  onRename?: (node: FileNode, newName: string) => void;
  onDelete?: (node: FileNode) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  onFileSelect,
  onFileOpen,
  onRename,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(node.isOpen || false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);

  const handleClick = () => {
    if (node.type === 'file') {
      onFileSelect?.(node);
      onFileOpen?.(node);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleRename = () => {
    setIsEditing(true);
  };

  const handleSaveRename = () => {
    if (editName.trim() && editName !== node.name) {
      onRename?.(node, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditName(node.name);
      setIsEditing(false);
    }
  };

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'folder') {
      return isExpanded ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-blue-500" />;
    }

    const ext = node.name.split('.').pop()?.toLowerCase();
    const iconProps = { className: "w-4 h-4 text-gray-600" };

    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileText {...iconProps} className="w-4 h-4 text-yellow-500" />;
      case 'py':
        return <FileText {...iconProps} className="w-4 h-4 text-green-500" />;
      case 'html':
        return <FileText {...iconProps} className="w-4 h-4 text-orange-500" />;
      case 'css':
      case 'scss':
      case 'sass':
        return <FileText {...iconProps} className="w-4 h-4 text-blue-400" />;
      case 'json':
        return <FileText {...iconProps} className="w-4 h-4 text-yellow-400" />;
      case 'md':
        return <FileText {...iconProps} className="w-4 h-4 text-gray-400" />;
      case 'java':
        return <FileText {...iconProps} className="w-4 h-4 text-red-500" />;
      case 'cpp':
      case 'c':
      case 'h':
        return <FileText {...iconProps} className="w-4 h-4 text-blue-600" />;
      case 'go':
        return <FileText {...iconProps} className="w-4 h-4 text-cyan-500" />;
      case 'rs':
        return <FileText {...iconProps} className="w-4 h-4 text-orange-400" />;
      case 'php':
        return <FileText {...iconProps} className="w-4 h-4 text-indigo-500" />;
      case 'sql':
        return <FileText {...iconProps} className="w-4 h-4 text-pink-500" />;
      case 'sh':
      case 'bash':
        return <FileText {...iconProps} className="w-4 h-4 text-green-600" />;
      case 'xml':
        return <FileText {...iconProps} className="w-4 h-4 text-orange-600" />;
      case 'yml':
      case 'yaml':
        return <FileText {...iconProps} className="w-4 h-4 text-red-400" />;
      default:
        return <File {...iconProps} />;
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          className={`select-none group flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-sm transition-colors ${
            level > 0 ? `ml-${level * 4}` : ''
          }`}
          style={{ marginLeft: `${level * 16}px` }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', node.path);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (node.type === 'folder') {
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const sourcePath = e.dataTransfer.getData('text/plain');
            // Handle drop logic here (move files/folders)
            console.log('Dropped:', sourcePath, 'onto', node.path);
          }}
        >
          {node.type === 'folder' && (
            <div className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-1" onClick={handleClick}>
            {getFileIcon(node)}
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border border-blue-500 rounded px-1 text-sm outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {node.name}
                {node.isDirty && <span className="text-orange-500 ml-1">•</span>}
              </span>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ContextMenu.Trigger asChild>
              <button
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3 text-gray-500" />
              </button>
            </ContextMenu.Trigger>
          </div>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] z-50">
          <ContextMenu.Item
            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
            onClick={() => handleRename()}
          >
            <Edit2 className="w-4 h-4" />
            Rename
          </ContextMenu.Item>
          <ContextMenu.Item
            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
            onClick={() => onDelete?.(node)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ 
  workspace: propWorkspace, 
  onFileSelect, 
  onFileOpen 
}) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'file' | 'folder'>('file');
  const [newName, setNewName] = useState('');
  const [selectedParentPath, setSelectedParentPath] = useState('');

  const workspace = propWorkspace || workspaceService.getCurrentWorkspace();

  useEffect(() => {
    if (workspace) {
      setFiles(fileSystemService.buildFileTree(workspace.files));
    }
  }, [workspace]);

  const handleCreateNew = (type: 'file' | 'folder', parentPath: string = '') => {
    setDialogType(type);
    setSelectedParentPath(parentPath);
    setNewName('');
    setDialogOpen(true);
  };

  const handleSaveNew = async () => {
    if (!newName.trim() || !workspace) return;

    const fullPath = selectedParentPath 
      ? `${selectedParentPath}/${newName.trim()}`
      : newName.trim();

    try {
      if (dialogType === 'file') {
        const language = fileSystemService.detectLanguage(newName);
        const newFile = await fileSystemService.createFile(newName, fullPath, '', language);
        await workspaceService.addFileToWorkspace(workspace.id, newFile);
      } else {
        const newFolder = await fileSystemService.createFolder(newName, fullPath);
        await workspaceService.addFileToWorkspace(workspace.id, newFolder);
      }

      // Refresh files from the file system
      const allFiles = await fileSystemService.getAllFiles();
      const updatedFiles = fileSystemService.buildFileTree(allFiles);
      setFiles(updatedFiles);
      setDialogOpen(false);
      setNewName('');
    } catch (error) {
      console.error('Error creating file/folder:', error);
      alert('Failed to create file/folder. Please try again.');
    }
  };

  const handleRename = async (node: FileNode, newName: string) => {
    if (!workspace) return;

    const oldPath = node.path;
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');

    try {
      await fileSystemService.renameFile(oldPath, newPath, newName);
      
      // Refresh files from the file system
      const allFiles = await fileSystemService.getAllFiles();
      const updatedFiles = fileSystemService.buildFileTree(allFiles);
      setFiles(updatedFiles);
    } catch (error) {
      console.error('Error renaming file/folder:', error);
      alert('Failed to rename file/folder. Please try again.');
    }
  };

  const handleDelete = async (node: FileNode) => {
    if (!workspace || !confirm(`Are you sure you want to delete "${node.name}"?`)) return;

    try {
      await fileSystemService.deleteFile(node.path);
      await workspaceService.removeFileFromWorkspace(workspace.id, node.path);
      
      // Refresh files from the file system
      const allFiles = await fileSystemService.getAllFiles();
      const updatedFiles = fileSystemService.buildFileTree(allFiles);
      setFiles(updatedFiles);
    } catch (error) {
      console.error('Error deleting file/folder:', error);
      alert('Failed to delete file/folder. Please try again.');
    }
  };

  const renderTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => (
      <TreeNode
        key={node.path}
        node={node}
        level={level}
        onFileSelect={onFileSelect}
        onFileOpen={onFileOpen}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    ));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Explorer
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => handleCreateNew('file')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="New File"
          >
            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => handleCreateNew('folder')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
            <Folder className="w-12 h-12 mb-2" />
            <p className="text-sm">No files yet</p>
            <button
              onClick={() => handleCreateNew('file')}
              className="mt-2 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Create your first file
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {renderTree(files)}
          </div>
        )}
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[400px] z-50">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Create New {dialogType === 'file' ? 'File' : 'Folder'}
            </Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {dialogType === 'file' ? 'File' : 'Folder'} Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveNew();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={dialogType === 'file' ? 'example.js' : 'my-folder'}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleSaveNew}
                  disabled={!newName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default FileExplorer;
