import React from 'react';
import Terminal from './Terminal';

interface TerminalPanelProps {
  workspaceId: string;
  isVisible?: boolean;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  workspaceId,
  isVisible = true
}) => {
  return (
    <div className="h-full bg-zinc-900">
      <Terminal
        workspaceId={workspaceId}
        isVisible={isVisible}
      />
    </div>
  );
};