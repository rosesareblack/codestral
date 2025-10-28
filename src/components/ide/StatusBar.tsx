import React from 'react';
import { 
  GitBranch, 
  GitCommit, 
  Circle, 
  Monitor, 
  Terminal, 
  MessageCircle,
  Code2,
  FileText,
  Files
} from 'lucide-react';
import { Workspace, FileNode } from '@/types';

interface StatusBarProps {
  workspace: Workspace;
  activeFile: FileNode | null;
  isMobile?: boolean;
  leftPanelVisible?: boolean;
  rightPanelVisible?: boolean;
  onLeftPanelToggle?: () => void;
  onRightPanelToggle?: () => void;
  onRightPanelModeChange: (mode: 'terminal' | 'ai') => void;
  currentMode: 'terminal' | 'ai';
}

export const StatusBar: React.FC<StatusBarProps> = ({
  workspace,
  activeFile,
  isMobile = false,
  leftPanelVisible = true,
  rightPanelVisible = true,
  onLeftPanelToggle,
  onRightPanelToggle,
  onRightPanelModeChange,
  currentMode
}) => {
  const getLanguage = (file: FileNode | null) => {
    if (!file) return 'No file';
    return file.language || 'plaintext';
  };

  const getLineCount = (file: FileNode | null) => {
    if (!file || !file.content) return 0;
    return file.content.split('\n').length;
  };

  const getCurrentBranch = () => {
    return 'main'; // Mock branch
  };

  const getCurrentCommit = () => {
    return 'a1b2c3d'; // Mock commit
  };

  return (
    <div className="h-6 bg-zinc-950 border-t border-zinc-700 flex items-center justify-between px-4 text-xs text-zinc-400">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          <span>{getCurrentBranch()}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <GitCommit className="w-3 h-3" />
          <span>{getCurrentCommit()}</span>
        </div>

        <div className="flex items-center gap-1">
          <Circle className="w-2 h-2 fill-green-500 text-green-500" />
          <span>Connected</span>
        </div>
      </div>

      {/* Center Section - File Info */}
      <div className="flex items-center gap-4">
        {activeFile && (
          <>
            <div className="flex items-center gap-1">
              <Code2 className="w-3 h-3" />
              <span>{activeFile.name}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{getLanguage(activeFile)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span>{getLineCount(activeFile)} lines</span>
            </div>
          </>
        )}
      </div>

      {/* Right Section - Panel Controls */}
      <div className="flex items-center gap-2">
        {/* Left Panel Toggle - Mobile only */}
        {isMobile && (
          <button
            onClick={onLeftPanelToggle}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              leftPanelVisible 
                ? 'bg-zinc-800 text-zinc-200' 
                : 'hover:bg-zinc-800'
            }`}
            title="Toggle File Explorer"
          >
            <Files className="w-3 h-3" />
            <span>Files</span>
          </button>
        )}

        <button
          onClick={() => {
            onRightPanelModeChange('terminal');
            onRightPanelToggle?.();
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            currentMode === 'terminal' && rightPanelVisible
              ? 'bg-zinc-800 text-zinc-200' 
              : 'hover:bg-zinc-800'
          }`}
          title="Toggle Terminal"
        >
          <Terminal className="w-3 h-3" />
          <span>Terminal</span>
        </button>

        <button
          onClick={() => {
            onRightPanelModeChange('ai');
            onRightPanelToggle?.();
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            currentMode === 'ai' && rightPanelVisible
              ? 'bg-zinc-800 text-zinc-200' 
              : 'hover:bg-zinc-800'
          }`}
          title="Toggle AI Chat"
        >
          <MessageCircle className="w-3 h-3" />
          <span>AI</span>
        </button>

        <div className="h-3 w-px bg-zinc-700" />

        <div className="flex items-center gap-1">
          <Monitor className="w-3 h-3" />
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};