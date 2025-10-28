import React, { useState } from 'react';
import { 
  Menu, 
  FolderOpen, 
  Play, 
  Save, 
  GitBranch, 
  Settings,
  X,
  ChevronDown,
  Search,
  GitCommit,
  Files,
  Terminal,
  User,
  LogOut
} from 'lucide-react';
import { Workspace, FileNode } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  workspace: Workspace;
  openFiles: FileNode[];
  activeFileId: string | null;
  onFileSelect: (file: FileNode) => void;
  onFileClose: (fileId: string) => void;
  isMobile?: boolean;
  leftPanelVisible?: boolean;
  rightPanelVisible?: boolean;
  onLeftPanelToggle?: () => void;
  onRightPanelToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  workspace,
  openFiles,
  activeFileId,
  onFileSelect,
  onFileClose,
  isMobile = false,
  leftPanelVisible = true,
  rightPanelVisible = true,
  onLeftPanelToggle,
  onRightPanelToggle
}) => {
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const activeFile = openFiles.find(f => f.id === activeFileId);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="h-12 bg-zinc-900 border-b border-zinc-700 flex items-center px-4 gap-4">
      {/* Logo and Workspace Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">C</span>
          </div>
          <span className="text-sm font-medium text-zinc-100">Codestral IDE</span>
        </div>
        {!isMobile && (
          <>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">{workspace.name}</span>
            </div>
          </>
        )}
      </div>

      {/* Mobile Panel Toggle Buttons */}
      {isMobile && (
        <>
          <div className="flex items-center gap-1">
            <button
              onClick={onLeftPanelToggle}
              className={`p-2 rounded transition-colors ${
                leftPanelVisible 
                  ? 'bg-zinc-700 text-blue-400' 
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
              title="Toggle File Explorer"
            >
              <Files className="w-4 h-4" />
            </button>
            <button
              onClick={onRightPanelToggle}
              className={`p-2 rounded transition-colors ${
                rightPanelVisible 
                  ? 'bg-zinc-700 text-blue-400' 
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
              title="Toggle Terminal"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
        </>
      )}

      {/* Workspace name on mobile */}
      {isMobile && (
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-300 truncate max-w-32">{workspace.name}</span>
        </div>
      )}

      {/* File Tabs */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {openFiles.map((file) => (
          <div
            key={file.id}
            className={`group relative flex items-center gap-2 px-3 py-2 border-r border-zinc-700 hover:bg-zinc-800 transition-colors cursor-pointer ${
              file.id === activeFileId ? 'bg-zinc-800' : ''
            }`}
            onClick={() => onFileSelect(file)}
          >
            <span className="text-sm text-zinc-300 truncate max-w-32">
              {file.name}
            </span>
            {file.isDirty && (
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileClose(file.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded p-0.5 transition-all"
            >
              <X className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button 
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Save (Ctrl+S)"
        >
          <Save className="w-4 h-4" />
        </button>
        
        <button 
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Run (F5)"
        >
          <Play className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-700" />

        <button 
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Git Status"
        >
          <GitCommit className="w-4 h-4" />
        </button>

        <button 
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Git Branches"
        >
          <GitBranch className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-700" />

        <button 
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Search (Ctrl+Shift+F)"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="text-sm hidden md:block">{user?.email?.split('@')[0] || 'User'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowUserMenu(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 top-full mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-50">
                <div className="p-3 border-b border-zinc-700">
                  <p className="text-sm text-zinc-100 font-medium">{user?.email}</p>
                  <p className="text-xs text-zinc-400">Signed in to Codestral IDE</p>
                </div>
                
                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 rounded transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-4 w-px bg-zinc-700" />

        <button 
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-700" />

        <button className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors">
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};