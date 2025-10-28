import React from 'react';
import AIChat from './AIChat';
import { Workspace, FileNode } from '@/types';

interface AIChatPanelProps {
  workspace: Workspace;
  activeFile: FileNode | null;
  isVisible?: boolean;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  workspace,
  activeFile,
  isVisible = true
}) => {
  return (
    <div className="h-full bg-zinc-900">
      <AIChat
        workspace={workspace}
        activeFile={activeFile}
        isVisible={isVisible}
      />
    </div>
  );
};