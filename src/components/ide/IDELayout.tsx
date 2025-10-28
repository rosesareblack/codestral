import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { FileExplorer } from './FileExplorer';
import { CodeEditor } from './CodeEditor';
import { TerminalPanel } from './TerminalPanel';
import { AIChatPanel } from './AIChatPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useIsMobile } from '@/hooks/use-mobile';
import { workspaceService } from '@/services/WorkspaceService';
import { FileNode, Workspace } from '@/types';

export const IDELayout: React.FC = () => {
  const isMobile = useIsMobile();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [openFiles, setOpenFiles] = useState<FileNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isRightPanelActive, setIsRightPanelActive] = useState<'terminal' | 'ai'>('terminal');
  const [rightPanelVisible, setRightPanelVisible] = useState(!isMobile);
  const [leftPanelVisible, setLeftPanelVisible] = useState(!isMobile);

  useEffect(() => {
    // Initialize with the current workspace or create a default one
    const workspace = workspaceService.getCurrentWorkspace();
    if (!workspace) {
      // Create a default workspace
      workspaceService.createWorkspace('My Workspace', 'Default workspace', 'javascript');
    }
    setCurrentWorkspace(workspaceService.getCurrentWorkspace() || null);
  }, []);

  // Adjust panel visibility based on mobile state
  useEffect(() => {
    if (isMobile) {
      setRightPanelVisible(false);
      setLeftPanelVisible(false);
    } else {
      setRightPanelVisible(true);
      setLeftPanelVisible(true);
    }
  }, [isMobile]);

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'file') {
      // Check if file is already open
      const existingFileIndex = openFiles.findIndex(f => f.id === file.id);
      
      if (existingFileIndex >= 0) {
        // File is already open, set it as active
        setActiveFileId(file.id);
      } else {
        // Open new file
        const updatedOpenFiles = [...openFiles, file];
        setOpenFiles(updatedOpenFiles);
        setActiveFileId(file.id);
      }
    }
  };

  const handleFileClose = (fileId: string) => {
    const updatedOpenFiles = openFiles.filter(f => f.id !== fileId);
    setOpenFiles(updatedOpenFiles);
    
    // If closed file was active, switch to another open file
    if (activeFileId === fileId) {
      if (updatedOpenFiles.length > 0) {
        setActiveFileId(updatedOpenFiles[updatedOpenFiles.length - 1].id);
      } else {
        setActiveFileId(null);
      }
    }
  };

  const handleFileContentChange = (fileId: string, content: string) => {
    // Update open file content
    const updatedOpenFiles = openFiles.map(f => 
      f.id === fileId ? { ...f, content, isDirty: true } : f
    );
    setOpenFiles(updatedOpenFiles);
    
    // Update workspace file content
    if (currentWorkspace) {
      const updatedFiles = currentWorkspace.files.map(f =>
        f.id === fileId ? { ...f, content, isDirty: true } : f
      );
      workspaceService.updateWorkspace(currentWorkspace.id, { files: updatedFiles });
      setCurrentWorkspace({ ...currentWorkspace, files: updatedFiles });
    }
  };

  const getActiveFile = () => {
    return openFiles.find(f => f.id === activeFileId) || null;
  };

  const handleLeftPanelToggle = () => {
    setLeftPanelVisible(!leftPanelVisible);
    if (!isMobile) {
      setRightPanelVisible(false);
      setIsRightPanelActive('terminal');
    }
  };

  const handleRightPanelToggle = () => {
    setRightPanelVisible(!rightPanelVisible);
    if (!isMobile) {
      setLeftPanelVisible(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-zinc-400">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-900 text-zinc-100">
      {/* Header */}
      <Header 
        workspace={currentWorkspace}
        openFiles={openFiles}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
        onFileClose={handleFileClose}
        isMobile={isMobile}
        leftPanelVisible={leftPanelVisible}
        rightPanelVisible={rightPanelVisible}
        onLeftPanelToggle={handleLeftPanelToggle}
        onRightPanelToggle={handleRightPanelToggle}
      />

      {/* Main IDE Layout */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          // Mobile Layout - Show one panel at a time
          <div className="h-full relative">
            {/* File Explorer Panel */}
            <div className={`h-full ${leftPanelVisible ? 'block' : 'hidden'}`}>
              <FileExplorer
                workspace={currentWorkspace}
                onFileSelect={handleFileSelect}
              />
            </div>

            {/* Code Editor Panel */}
            <div className={`h-full ${!leftPanelVisible && !rightPanelVisible ? 'block' : 'hidden'}`}>
              <CodeEditor
                workspace={currentWorkspace}
                openFiles={openFiles}
                activeFile={getActiveFile()}
                onFileContentChange={handleFileContentChange}
              />
            </div>

            {/* Right Panel - Terminal & AI Chat */}
            {rightPanelVisible && (
              <div className="h-full absolute inset-0 bg-zinc-900">
                <PanelGroup direction="vertical">
                  {/* Terminal Panel */}
                  <Panel defaultSize={60} minSize={30}>
                    <TerminalPanel
                      workspaceId={currentWorkspace.id}
                      isVisible={isRightPanelActive === 'terminal'}
                    />
                  </Panel>

                  <PanelResizeHandle className="h-1 bg-zinc-800 hover:bg-zinc-700 transition-colors" />

                  {/* AI Chat Panel */}
                  <Panel defaultSize={40} minSize={30}>
                    <AIChatPanel
                      workspace={currentWorkspace}
                      activeFile={getActiveFile()}
                      isVisible={isRightPanelActive === 'ai'}
                    />
                  </Panel>
                </PanelGroup>
              </div>
            )}
          </div>
        ) : (
          // Desktop Layout - Three panels visible
          <PanelGroup direction="horizontal">
            {/* Left Panel - File Explorer */}
            <Panel 
              defaultSize={20} 
              minSize={15} 
              maxSize={35}
              className={!leftPanelVisible ? 'hidden' : ''}
            >
              <FileExplorer
                workspace={currentWorkspace}
                onFileSelect={handleFileSelect}
              />
            </Panel>

            <PanelResizeHandle 
              className="w-1 bg-zinc-800 hover:bg-zinc-700 transition-colors" 
              style={{ display: leftPanelVisible ? 'block' : 'none' }}
            />

            {/* Center Panel - Code Editor */}
            <Panel defaultSize={leftPanelVisible && rightPanelVisible ? 55 : leftPanelVisible ? 70 : 80} minSize={30}>
              <CodeEditor
                workspace={currentWorkspace}
                openFiles={openFiles}
                activeFile={getActiveFile()}
                onFileContentChange={handleFileContentChange}
              />
            </Panel>

            {/* Right Panel - Terminal & AI Chat */}
            <Panel 
              defaultSize={25} 
              minSize={15} 
              maxSize={40}
              className={!rightPanelVisible ? 'hidden' : ''}
            >
              <PanelGroup direction="vertical">
                {/* Terminal Panel */}
                <Panel defaultSize={60} minSize={30}>
                  <TerminalPanel
                    workspaceId={currentWorkspace.id}
                    isVisible={isRightPanelActive === 'terminal'}
                  />
                </Panel>

                <PanelResizeHandle className="h-1 bg-zinc-800 hover:bg-zinc-700 transition-colors" />

                {/* AI Chat Panel */}
                <Panel defaultSize={40} minSize={30}>
                  <AIChatPanel
                    workspace={currentWorkspace}
                    activeFile={getActiveFile()}
                    isVisible={isRightPanelActive === 'ai'}
                  />
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        workspace={currentWorkspace}
        activeFile={getActiveFile()}
        isMobile={isMobile}
        leftPanelVisible={leftPanelVisible}
        rightPanelVisible={rightPanelVisible}
        onLeftPanelToggle={handleLeftPanelToggle}
        onRightPanelToggle={handleRightPanelToggle}
        onRightPanelModeChange={setIsRightPanelActive}
        currentMode={isRightPanelActive}
      />

      {/* Mobile Panel Toggle Buttons (Visible when panels are hidden) */}
      {isMobile ? (
        <div className="absolute right-4 bottom-20 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 p-2 flex flex-col gap-1">
          <button
            onClick={() => {
              setLeftPanelVisible(true);
              setRightPanelVisible(false);
            }}
            className={`px-3 py-2 text-sm rounded transition-colors flex items-center gap-2 ${
              leftPanelVisible 
                ? 'bg-blue-600 text-white' 
                : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <span>📁</span>
            Files
          </button>
          <button
            onClick={() => {
              setLeftPanelVisible(false);
              setRightPanelVisible(false);
            }}
            className={`px-3 py-2 text-sm rounded transition-colors flex items-center gap-2 ${
              !leftPanelVisible && !rightPanelVisible 
                ? 'bg-blue-600 text-white' 
                : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <span>📝</span>
            Editor
          </button>
          <button
            onClick={() => {
              setRightPanelVisible(true);
              setLeftPanelVisible(false);
              setIsRightPanelActive('terminal');
            }}
            className={`px-3 py-2 text-sm rounded transition-colors flex items-center gap-2 ${
              rightPanelVisible && isRightPanelActive === 'terminal' 
                ? 'bg-blue-600 text-white' 
                : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <span>🖥️</span>
            Terminal
          </button>
          <button
            onClick={() => {
              setRightPanelVisible(true);
              setLeftPanelVisible(false);
              setIsRightPanelActive('ai');
            }}
            className={`px-3 py-2 text-sm rounded transition-colors flex items-center gap-2 ${
              rightPanelVisible && isRightPanelActive === 'ai' 
                ? 'bg-blue-600 text-white' 
                : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <span>🤖</span>
            AI Chat
          </button>
        </div>
      ) : (
        /* Desktop Right Panel Toggle (when right panel is hidden) */
        !rightPanelVisible && (
          <div className="absolute right-4 top-20 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 p-2 flex flex-col gap-1">
            <button
              onClick={() => {
                setRightPanelVisible(true);
                setIsRightPanelActive('terminal');
              }}
              className="px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors flex items-center gap-2"
            >
              <span>🖥️</span>
              Terminal
            </button>
            <button
              onClick={() => {
                setRightPanelVisible(true);
                setIsRightPanelActive('ai');
              }}
              className="px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors flex items-center gap-2"
            >
              <span>🤖</span>
              AI Chat
            </button>
          </div>
        )
      )}
    </div>
  );
};