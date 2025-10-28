import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { FileNode, LSPDiagnostic, Workspace } from '@/types';
import { fileSystemService } from '@/services/FileSystemService';
// Monaco is loaded through @monaco-editor/react
import {
  Maximize2,
  Minimize2,
  Split,
  X,
  Save,
  Plus,
  FileText,
  Settings,
  RotateCcw,
} from 'lucide-react';

interface EditorTab {
  id: string;
  filePath: string;
  fileName: string;
  language: string;
  content: string;
  isDirty: boolean;
}

interface CodeEditorProps {
  workspace: Workspace;
  openFiles: FileNode[];
  activeFile: FileNode | null;
  onFileContentChange: (fileId: string, content: string) => void;
}

interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative' | 'interval';
  autoSave: boolean;
  autoSaveDelay: number;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  autoSave: true,
  autoSaveDelay: 1000,
};

const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
  'go', 'rust', 'ruby', 'php', 'html', 'css', 'scss', 'json', 'xml',
  'yaml', 'markdown', 'sql', 'shell', 'plaintext'
];

const LINTING_TIMEOUT = 1000;

export const CodeEditor: React.FC<CodeEditorProps> = ({
  workspace,
  openFiles,
  activeFile,
  onFileContentChange,
}) => {
  // Core state
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editor refs
  const mainEditorRef = useRef<any>(null);
  const secondaryEditorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lintingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<Map<string, LSPDiagnostic[]>>(new Map());

  // Get current file
  const activeTab = useMemo(
    () => tabs.find(tab => tab.id === activeTabId) || null,
    [tabs, activeTabId]
  );

  const secondaryTab = useMemo(() => {
    if (!isSplitView || tabs.length < 2) return null;
    const otherTabs = tabs.filter(tab => tab.id !== activeTabId);
    return otherTabs.length > 0 ? otherTabs[0] : null;
  }, [tabs, activeTabId, isSplitView]);

  // Initialize Monaco editor features
  const configureMonaco = useCallback((monaco: Monaco) => {
    // Define custom theme
    monaco.editor.defineTheme('codestral-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2d2d30',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
      },
    });

    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // Add extra libraries for better IntelliSense
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  }, []);

  // Editor mount handler
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    monacoRef.current = monaco;
    mainEditorRef.current = editor;
    
    configureMonaco(monaco);

    // Configure editor options
    editor.updateOptions({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap,
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'smart',
      tabCompletion: 'on',
      parameterHints: { enabled: true },
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true,
      },
      formatOnPaste: true,
      formatOnType: true,
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeTab) {
        saveFile(activeTab);
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
      editor.trigger('keyboard', 'undo', null);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
      editor.trigger('keyboard', 'redo', null);
    });

    // Set up change detection and auto-save
    editor.onDidChangeModelContent(() => {
      if (activeTab) {
        const content = editor.getValue();
        updateTabContent(activeTab.id, content);
        triggerAutoSave(activeTab.id);
        scheduleLinting(activeTab.filePath, content, activeTab.language);
      }
    });

    // Configure model for active tab
    if (activeTab) {
      const model = monaco.editor.createModel(
        activeTab.content,
        activeTab.language,
        monaco.Uri.file(activeTab.filePath)
      );
      editor.setModel(model);
    }

    // Handle cursor position changes for collaboration
    editor.onDidChangeCursorPosition((e) => {
      // TODO: Implement cursor position tracking for collaboration
    });
  }, [activeTab, settings, configureMonaco]);

  // Handle secondary editor mount (for split view)
  const handleSecondaryEditorMount: OnMount = useCallback((editor, monaco) => {
    secondaryEditorRef.current = editor;
    
    // Configure editor with same settings
    editor.updateOptions({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap,
      minimap: { enabled: settings.minimap },
      lineNumbers: settings.lineNumbers,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
    });

    // Set up change detection
    editor.onDidChangeModelContent(() => {
      if (secondaryTab) {
        const content = editor.getValue();
        updateTabContent(secondaryTab.id, content);
        triggerAutoSave(secondaryTab.id);
        scheduleLinting(secondaryTab.filePath, content, secondaryTab.language);
      }
    });

    // Configure model for secondary tab
    if (secondaryTab) {
      const model = monaco.editor.createModel(
        secondaryTab.content,
        secondaryTab.language,
        monaco.Uri.file(secondaryTab.filePath)
      );
      editor.setModel(model);
    }
  }, [secondaryTab, settings]);

  // Update tab content
  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, content, isDirty: true }
        : tab
    ));
  }, []);

  // Auto-save functionality
  const triggerAutoSave = useCallback((tabId: string) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (settings.autoSave) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
          saveFile(tab);
        }
      }, settings.autoSaveDelay);
    }
  }, [settings.autoSave, settings.autoSaveDelay, tabs]);

  // Save file
  const saveFile = useCallback(async (tab: EditorTab) => {
    setIsSaving(true);
    try {
      onFileContentChange(tab.id, tab.content);
      
      setTabs(prev => prev.map(t => 
        t.id === tab.id 
          ? { ...t, isDirty: false }
          : t
      ));
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onFileContentChange]);

  // Linting and error detection
  const scheduleLinting = useCallback((filePath: string, content: string, language: string) => {
    if (lintingTimeoutRef.current) {
      clearTimeout(lintingTimeoutRef.current);
    }

    lintingTimeoutRef.current = setTimeout(() => {
      performLinting(filePath, content, language);
    }, LINTING_TIMEOUT);
  }, []);

  const performLinting = useCallback((filePath: string, content: string, language: string) => {
    const monacoInstance = monacoRef.current;
    if (!monacoInstance) return;

    const model = monacoInstance.editor.getModel(monacoInstance.Uri.file(filePath));
    if (!model) return;

    const markers: any[] = [];

    // Basic syntax validation based on language
    switch (language) {
      case 'javascript':
      case 'typescript':
        // Basic JS/TS validation
        try {
          // eslint-disable-next-line no-new-func
          new Function(content);
        } catch (error) {
          markers.push({
            severity: monacoInstance.MarkerSeverity.Error,
            message: `Syntax Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          });
        }
        break;

      case 'json':
        try {
          JSON.parse(content);
        } catch (error) {
          markers.push({
            severity: monacoInstance.MarkerSeverity.Error,
            message: `Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          });
        }
        break;

      case 'python':
        // Basic Python syntax check (simplified)
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          const lineNum = index + 1;
          // Check for common Python syntax issues
          if (line.includes('print ') && !line.trim().startsWith('#')) {
            // Warning about print statements (Python 2 style)
            markers.push({
              severity: monacoInstance.MarkerSeverity.Warning,
              message: 'Consider using print() function (Python 3)',
              startLineNumber: lineNum,
              startColumn: 1,
              endLineNumber: lineNum,
              endColumn: line.length,
            });
          }
        });
        break;
    }

    monacoInstance.editor.setModelMarkers(model, 'codestral-linter', markers);

    // Update diagnostics state
    const newDiagnostics: LSPDiagnostic[] = markers.map(marker => ({
      filePath,
      line: marker.startLineNumber,
      column: marker.startColumn,
      severity: marker.severity === monacoInstance.MarkerSeverity.Error ? 'error' :
                marker.severity === monacoInstance.MarkerSeverity.Warning ? 'warning' :
                marker.severity === monacoInstance.MarkerSeverity.Info ? 'info' : 'hint',
      message: marker.message,
      source: 'Codestral Linter',
    }));

    setDiagnostics(prev => new Map(prev.set(filePath, newDiagnostics)));
  }, []);

  // Format code
  const formatCode = useCallback(() => {
    const editor = isSplitView && secondaryTab ? secondaryEditorRef.current : mainEditorRef.current;
    if (editor) {
      editor.getAction('editor.action.formatDocument')?.run();
    }
  }, [isSplitView, secondaryTab]);

  // Open file in editor
  const openFile = useCallback((file: FileNode) => {
    if (file.type !== 'file') return;

    const existingTab = tabs.find(tab => tab.filePath === file.path);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const language = file.language || fileSystemService.detectLanguage(file.name);
    const newTab: EditorTab = {
      id: file.id,
      filePath: file.path,
      fileName: file.name,
      language,
      content: file.content || '',
      isDirty: file.isDirty || false,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs]);

  // Close tab
  const closeTab = useCallback(async (tabId: string) => {
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    
    if (activeTabId === tabId) {
      const remainingTabs = tabs.filter(tab => tab.id !== tabId);
      setActiveTabId(remainingTabs.length > 0 ? remainingTabs[0].id : null);
    }

    // Mark file as closed
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      try {
        const file = await fileSystemService.getFile(tab.filePath);
        if (file) {
          file.isOpen = false;
        }
      } catch (error) {
        console.error('Error updating file status:', error);
      }
    }
  }, [tabs, activeTabId]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Toggle split view
  const toggleSplitView = useCallback(() => {
    setIsSplitView(prev => !prev);
  }, []);

  // Handle settings changes
  const updateSetting = useCallback(<K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Apply settings to editor
  useEffect(() => {
    const editor = mainEditorRef.current;
    if (editor) {
      editor.updateOptions({
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers,
      });
    }

    const secondaryEditor = secondaryEditorRef.current;
    if (secondaryEditor) {
      secondaryEditor.updateOptions({
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers,
      });
    }
  }, [settings]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (lintingTimeoutRef.current) {
        clearTimeout(lintingTimeoutRef.current);
      }
    };
  }, []);

  // Load open files
  useEffect(() => {
    if (openFiles.length > 0 && tabs.length === 0) {
      const openableFiles = openFiles.filter(file => 
        file.type === 'file' && file.isOpen
      );
      
      openableFiles.forEach(openFile);
      
      if (openableFiles.length > 0) {
        setActiveTabId(openableFiles[0].id);
      }
    }
  }, [openFiles, openFile, tabs.length]);

  // Sync activeFile with activeTab
  useEffect(() => {
    if (activeFile && activeFile.id !== activeTabId) {
      setActiveTabId(activeFile.id);
    }
  }, [activeFile, activeTabId]);

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          {/* Split View Toggle */}
          <button
            onClick={toggleSplitView}
            className={`p-2 rounded hover:bg-gray-700 ${
              isSplitView ? 'text-blue-400' : 'text-gray-400'
            }`}
            title="Toggle Split View"
          >
            <Split size={18} />
          </button>

          {/* Format Code Button */}
          <button
            onClick={formatCode}
            className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
            title="Format Code"
          >
            <RotateCcw size={18} />
          </button>

          {/* Save Button */}
          {activeTab?.isDirty && (
            <button
              onClick={() => activeTab && saveFile(activeTab)}
              disabled={isSaving}
              className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-50"
              title="Save File (Ctrl+S)"
            >
              <Save size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
            title="Settings"
          >
            <Settings size={18} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Font Size: {settings.fontSize}px
              </label>
              <input
                type="range"
                min="10"
                max="24"
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tab Size: {settings.tabSize}
              </label>
              <select
                value={settings.tabSize}
                onChange={(e) => updateSetting('tabSize', parseInt(e.target.value))}
                className="w-full px-3 py-1 bg-gray-700 text-white rounded"
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={8}>8</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Word Wrap
              </label>
              <select
                value={settings.wordWrap}
                onChange={(e) => updateSetting('wordWrap', e.target.value as any)}
                className="w-full px-3 py-1 bg-gray-700 text-white rounded"
              >
                <option value="off">Off</option>
                <option value="on">On</option>
                <option value="wordWrapColumn">Word Wrap Column</option>
                <option value="bounded">Bounded</option>
              </select>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                <input
                  type="checkbox"
                  checked={settings.minimap}
                  onChange={(e) => updateSetting('minimap', e.target.checked)}
                  className="rounded"
                />
                <span>Minimap</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      {tabs.length > 0 && (
        <div className="flex items-center bg-gray-800 border-b border-gray-700 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center px-4 py-2 border-r border-gray-700 cursor-pointer min-w-0 ${
                tab.id === activeTabId ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <FileText size={16} className="mr-2 flex-shrink-0" />
              <span className="truncate max-w-[150px]" title={tab.fileName}>
                {tab.fileName}
              </span>
              {tab.isDirty && <span className="ml-1 text-blue-400">●</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-2 p-1 rounded hover:bg-gray-600 flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Editor Area */}
      <div className={`flex-1 ${isSplitView ? 'grid grid-cols-2' : ''}`}>
        {/* Main Editor */}
        <div className={`relative ${isSplitView ? 'border-r border-gray-700' : ''}`}>
          {activeTab ? (
            <Editor
              height="100%"
              defaultLanguage={activeTab.language}
              defaultValue={activeTab.content}
              theme="codestral-dark"
              onMount={handleEditorMount}
              loading={
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Loading editor...</p>
                  </div>
                </div>
              }
              options={{
                selectOnLineNumbers: true,
                roundedSelection: false,
                readOnly: false,
                cursorStyle: 'line',
                automaticLayout: true,
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <FileText size={64} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg">No file open</p>
                <p className="text-sm">Select a file from the explorer to start editing</p>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Editor (Split View) */}
        {isSplitView && secondaryTab && (
          <div className="relative">
            <Editor
              height="100%"
              defaultLanguage={secondaryTab.language}
              defaultValue={secondaryTab.content}
              theme="codestral-dark"
              onMount={handleSecondaryEditorMount}
              options={{
                selectOnLineNumbers: true,
                roundedSelection: false,
                readOnly: false,
                cursorStyle: 'line',
                automaticLayout: true,
              }}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          {activeTab && (
            <>
              <span>{activeTab.fileName}</span>
              <span>{activeTab.language}</span>
              {activeTab.isDirty && <span className="text-blue-400">Unsaved</span>}
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {isSaving && <span>Saving...</span>}
          {mainEditorRef.current && (
            <>
              <span>
                Line {mainEditorRef.current.getPosition()?.lineNumber || 1}, 
                Col {mainEditorRef.current.getPosition()?.column || 1}
              </span>
              <span>
                {mainEditorRef.current.getModel()?.getLineCount() || 0} lines
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
