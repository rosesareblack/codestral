import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { TerminalSession } from '@/types';
import { firecrackerService } from '@/services/FirecrackerService';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  X, 
  Trash2, 
  Copy, 
  Clipboard, 
  Terminal as TerminalIcon,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom styles for xterm
import 'xterm/css/xterm.css';

interface TerminalTab {
  id: string;
  sessionId: string;
  title: string;
  terminal: XTerm;
  fitAddon: FitAddon;
  currentDirectory: string;
}

interface TerminalProps {
  vmId?: string;
  workspaceId: string;
  onSessionCreate?: (session: TerminalSession) => void;
  className?: string;
  isVisible?: boolean;
}

const AUTOCOMPLETE_COMMANDS = [
  // File operations
  'ls', 'ls -la', 'ls -l', 'pwd', 'cd', 'cd ..', 'cd ~', 'mkdir', 'rmdir', 
  'rm', 'rm -rf', 'cp', 'cp -r', 'mv', 'touch', 'cat', 'less', 'more',
  'head', 'tail', 'find', 'find . -name', 'grep', 'grep -r',
  
  // System info
  'whoami', 'which', 'whereis', 'top', 'ps', 'ps aux', 'df -h', 'free -h',
  'uname -a', 'history', 'clear',
  
  // Development tools
  'node', 'node --version', 'npm', 'npm --version', 'npm install', 'npm run',
  'yarn', 'yarn --version', 'pnpm', 'pnpm --version', 'npx',
  'python', 'python --version', 'python3', 'python3 --version', 'pip', 'pip3',
  'git', 'git --version', 'git status', 'git add', 'git commit', 'git push', 'git pull',
  'git clone', 'git checkout', 'git branch', 'git log', 'git diff',
  
  // Process management
  'kill', 'killall', 'jobs', 'bg', 'fg', '&', 'nohup',
  
  // Network
  'curl', 'wget', 'ping', 'ssh', 'scp',
  
  // Archive
  'tar', 'tar -czf', 'tar -xzf', 'zip', 'unzip',
  
  // Text processing
  'sed', 'awk', 'sort', 'uniq', 'wc', 'cut', 'tr'
];

export const Terminal: React.FC<TerminalProps> = ({ 
  vmId, 
  workspaceId, 
  onSessionCreate,
  className 
}) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const [terminals, setTerminals] = useState<TerminalTab[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isMaximized, setIsMaximized] = useState(false);

  const activeTerminal = terminals.find(t => t.id === activeTerminalId);

  // Create a new terminal tab
  const createTerminal = useCallback(async () => {
    if (!vmId) {
      console.error('No VM ID provided for terminal creation');
      return;
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tabId = `tab-${Date.now()}`;

    // Create terminal instance
    const xtermTerminal = new XTerm({
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e50c',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      cols: 80,
      rows: 24,
      scrollback: 1000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xtermTerminal.loadAddon(fitAddon);
    xtermTerminal.loadAddon(webLinksAddon);

    const newTab: TerminalTab = {
      id: tabId,
      sessionId,
      title: `Terminal ${terminals.length + 1}`,
      terminal: xtermTerminal,
      fitAddon,
      currentDirectory: '/workspace'
    };

    setTerminals(prev => [...prev, newTab]);
    setActiveTerminalId(tabId);

    // Create session
    const session: TerminalSession = {
      id: sessionId,
      vmId,
      workspaceId,
      isActive: true
    };

    onSessionCreate?.(session);

    // Initialize terminal with welcome message
    xtermTerminal.writeln('\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════════════╗\x1b[0m');
    xtermTerminal.writeln('\x1b[36m║                          Welcome to CodeStral IDE Terminal                          ║\x1b[0m');
    xtermTerminal.writeln('\x1b[36m╚═══════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m');
    xtermTerminal.writeln('');
    xtermTerminal.writeln(`\x1b[32m🚀 Session:\x1b[0m ${sessionId.substring(0, 12)}...`);
    xtermTerminal.writeln(`\x1b[32m🖥️  VM ID:\x1b[0m ${vmId}`);
    xtermTerminal.writeln(`\x1b[32m📁 Working Directory:\x1b[0m ${newTab.currentDirectory}`);
    xtermTerminal.writeln(`\x1b[32m📅 Started:\x1b[0m ${new Date().toLocaleString()}`);
    xtermTerminal.writeln('');
    xtermTerminal.writeln('\x1b[33m💡 Quick Tips:\x1b[0m');
    xtermTerminal.writeln('   • Type \x1b[36mhelp\x1b[0m for commands and shortcuts');
    xtermTerminal.writeln('   • Use \x1b[36mTab\x1b[0m for autocomplete');
    xtermTerminal.writeln('   • Press \x1b[36mCtrl+L\x1b[0m to clear terminal');
    xtermTerminal.writeln('   • Use \x1b[36m↑/↓\x1b[0m arrows for command history');
    xtermTerminal.writeln('');
    xtermTerminal.write(`${newTab.currentDirectory}$ `);

    // Handle terminal input
    let currentLine = '';
    let commandHistory: string[] = [];
    let historyPosition = -1;

    xtermTerminal.onData(async (data) => {
      const code = data.charCodeAt(0);

      // Handle special keys
      if (code === 3) { // Ctrl+C
        xtermTerminal.writeln('^C');
        // Send interrupt signal to the process
        currentLine = '';
        // Check if there's a running process and interrupt it
        setTimeout(() => {
          xtermTerminal.write(`${newTab.currentDirectory}$ `);
        }, 100);
        return;
      }

      if (code === 12) { // Ctrl+L (clear)
        xtermTerminal.clear();
        xtermTerminal.writeln('\x1b[36m╔═══════════════════════════════════════════════════════════════╗\x1b[0m');
        xtermTerminal.writeln('\x1b[36m║                     Terminal Cleared                          ║\x1b[0m');
        xtermTerminal.writeln('\x1b[36m╚═══════════════════════════════════════════════════════════════╝\x1b[0m');
        xtermTerminal.write(`${newTab.currentDirectory}$ `);
        return;
      }

      if (code === 23) { // Ctrl+W (clear word)
        const lastSpace = currentLine.lastIndexOf(' ');
        if (lastSpace !== -1) {
          currentLine = currentLine.substring(0, lastSpace + 1);
        } else {
          currentLine = '';
        }
        xtermTerminal.write(`\r${newTab.currentDirectory}$ ${currentLine}`);
        // Clear remaining characters
        const cols = xtermTerminal.cols;
        const remaining = cols - newTab.currentDirectory.length - 2 - currentLine.length;
        if (remaining > 0) {
          xtermTerminal.write(' '.repeat(remaining));
        }
        xtermTerminal.write(`\r${newTab.currentDirectory}$ ${currentLine}`);
        return;
      }

      if (code === 11) { // Ctrl+K (clear to end of line)
        // Simple implementation - clear the entire current line
        const lineLength = newTab.currentDirectory.length + 2 + currentLine.length;
        xtermTerminal.write('\b'.repeat(currentLine.length) + ' '.repeat(currentLine.length) + '\b'.repeat(currentLine.length));
        currentLine = '';
        return;
      }

      if (code === 127) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          xtermTerminal.write('\b \b');
        }
        return;
      }

      if (code === 13) { // Enter
        xtermTerminal.writeln('');
        
        const command = currentLine.trim();
        if (command) {
          commandHistory = [command, ...commandHistory.slice(0, 99)];
          setHistory(commandHistory);
          
          await executeCommand(command, xtermTerminal, newTab);
        }
        
        currentLine = '';
        xtermTerminal.write(`${newTab.currentDirectory}$ `);
        return;
      }

      if (code === 27) { // Escape sequence (arrows)
        // Handle arrow keys
        if (data === '\x1b[A') { // Up arrow
          if (commandHistory.length > 0 && historyPosition < commandHistory.length - 1) {
            historyPosition++;
            currentLine = commandHistory[historyPosition];
            xtermTerminal.write(`\r${newTab.currentDirectory}$ ${currentLine}`);
            // Clear remaining characters
            const cols = xtermTerminal.cols;
            const remaining = cols - newTab.currentDirectory.length - 2 - currentLine.length;
            if (remaining > 0) {
              xtermTerminal.write(' '.repeat(remaining));
            }
            xtermTerminal.write(`\r${newTab.currentDirectory}$ ${currentLine}`);
          }
        } else if (data === '\x1b[B') { // Down arrow
          if (historyPosition > 0) {
            historyPosition--;
            currentLine = commandHistory[historyPosition];
          } else {
            historyPosition = -1;
            currentLine = '';
          }
          xtermTerminal.write(`\r${newTab.currentDirectory}$ ${currentLine}`);
          // Clear remaining characters
          const cols = xtermTerminal.cols;
          const remaining = cols - newTab.currentDirectory.length - 2 - currentLine.length;
          if (remaining > 0) {
            xtermTerminal.write(' '.repeat(remaining));
          }
          xtermTerminal.write(`\r${newTab.currentDirectory}$ `);
          xtermTerminal.write(currentLine);
        }
        return;
      }

      // Handle tab completion
      if (code === 9) { // Tab
        const autocompleteOptions = AUTOCOMPLETE_COMMANDS.filter(cmd => 
          cmd.startsWith(currentLine)
        );
        
        if (autocompleteOptions.length === 1) {
          currentLine = autocompleteOptions[0];
          xtermTerminal.write(`\r${newTab.currentDirectory}$ ${currentLine}`);
        } else if (autocompleteOptions.length > 1) {
          xtermTerminal.writeln('');
          xtermTerminal.writeln('\x1b[36mSuggestions:\x1b[0m');
          autocompleteOptions.forEach(cmd => {
            xtermTerminal.writeln(`  \x1b[32m${cmd}\x1b[0m`);
          });
          xtermTerminal.write(`\r${newTab.currentDirectory}$ ${currentLine}`);
        } else {
          // No suggestions, just add tab character
          xtermTerminal.write('  ');
        }
        return;
      }

      // Regular character input
      if (code >= 32) {
        currentLine += data;
        xtermTerminal.write(data);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (terminalContainerRef.current) {
        fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Fit terminal to container with retry mechanism
    const fitTerminal = () => {
      if (terminalContainerRef.current && activeTerminalId === tabId) {
        try {
          fitAddon.fit();
          xtermTerminal.scrollToBottom();
        } catch (error) {
          // Retry after a short delay if fitting fails
          setTimeout(fitTerminal, 100);
        }
      }
    };

    setTimeout(() => {
      if (terminalContainerRef.current) {
        xtermTerminal.open(terminalContainerRef.current);
        fitTerminal();
      }
    }, 100);

    // Handle window resize with debouncing
    let resizeTimeout: NodeJS.Timeout;
    const debouncedHandleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedHandleResize);

    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
      clearTimeout(resizeTimeout);
      xtermTerminal.dispose();
    };
  }, [vmId, workspaceId, terminals.length, onSessionCreate]);

  // Execute command
  const executeCommand = async (
    command: string, 
    xtermTerminal: XTerm, 
    tab: TerminalTab
  ) => {
    const executionStartTime = Date.now();
    
    try {
      // Handle built-in commands
      if (command === 'clear') {
        xtermTerminal.clear();
        xtermTerminal.write(`${tab.currentDirectory}$ `);
        return;
      }

      if (command === 'history') {
        history.forEach((cmd, index) => {
          xtermTerminal.writeln(`${index + 1}  ${cmd}`);
        });
        return;
      }

      if (command === 'help' || command === '--help' || command === '-h') {
        xtermTerminal.writeln('\x1b[36m╔═══════════════════════════════════════════════════════════════╗\x1b[0m');
        xtermTerminal.writeln('\x1b[36m║                    CodeStral IDE Terminal Help                 ║\x1b[0m');
        xtermTerminal.writeln('\x1b[36m╚═══════════════════════════════════════════════════════════════╝\x1b[0m');
        xtermTerminal.writeln('');
        xtermTerminal.writeln('\x1b[33mKeyboard Shortcuts:\x1b[0m');
        xtermTerminal.writeln('  \x1b[32mCtrl+C\x1b[0m     - Interrupt current command');
        xtermTerminal.writeln('  \x1b[32mCtrl+L\x1b[0m     - Clear terminal');
        xtermTerminal.writeln('  \x1b[32mCtrl+W\x1b[0m     - Delete previous word');
        xtermTerminal.writeln('  \x1b[32mCtrl+K\x1b[0m     - Clear to end of line');
        xtermTerminal.writeln('  \x1b[32m↑/↓\x1b[0m        - Command history navigation');
        xtermTerminal.writeln('  \x1b[32mTab\x1b[0m       - Command autocomplete');
        xtermTerminal.writeln('');
        xtermTerminal.writeln('\x1b[33mBuilt-in Commands:\x1b[0m');
        xtermTerminal.writeln('  \x1b[32mhelp\x1b[0m      - Show this help message');
        xtermTerminal.writeln('  \x1b[32mclear\x1b[0m     - Clear terminal screen');
        xtermTerminal.writeln('  \x1b[32mhistory\x1b[0m   - Show command history');
        xtermTerminal.writeln('');
        xtermTerminal.writeln('\x1b[33mTips:\x1b[0m');
        xtermTerminal.writeln('  • Use \x1b[36mTab\x1b[0m for command completion');
        xtermTerminal.writeln('  • \x1b[36m↑/↓\x1b[0m arrows navigate command history');
        xtermTerminal.writeln('  • Click terminal tabs to switch between sessions');
        xtermTerminal.writeln('  • Use \x1b[36m+\x1b[0m button to create new terminal sessions');
        xtermTerminal.writeln('');
        xtermTerminal.write(`${tab.currentDirectory}$ `);
        return;
      }

      if (command.startsWith('cd ')) {
        const dir = command.substring(3).trim();
        tab.currentDirectory = dir || '/workspace';
        xtermTerminal.write(`${tab.currentDirectory}$ `);
        return;
      }

      // Show command being executed
      xtermTerminal.writeln(`\x1b[33m> ${command}\x1b[0m`);

      // Execute via Firecracker service - use vmId instead of sessionId
      const output = await firecrackerService.executeCommand(vmId!, command);
      
      // Stream output with better formatting
      if (output) {
        // Handle different output formats
        const lines = output.split('\n').filter(line => line.trim());
        for (const line of lines) {
          // Apply syntax highlighting for common patterns
          let formattedLine = line;
          if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
            formattedLine = `\x1b[31m${line}\x1b[0m`; // Red for errors
          } else if (line.toLowerCase().includes('warning')) {
            formattedLine = `\x1b[33m${line}\x1b[0m`; // Yellow for warnings
          } else if (line.toLowerCase().includes('success') || line.toLowerCase().includes('done')) {
            formattedLine = `\x1b[32m${line}\x1b[0m`; // Green for success
          } else if (line.includes('→') || line.includes('=>')) {
            formattedLine = `\x1b[36m${line}\x1b[0m`; // Cyan for arrows/pointers
          }
          
          xtermTerminal.writeln(formattedLine);
          
          // Add small delay for streaming effect (except for fast commands)
          if (command.includes('npm') || command.includes('git') || command.includes('yarn')) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }
      
      // Show execution time for longer commands
      const executionTime = Date.now() - executionStartTime;
      if (executionTime > 1000) {
        xtermTerminal.writeln(`\x1b[90m[Execution time: ${executionTime}ms]\x1b[0m`);
      }

    } catch (error) {
      const executionTime = Date.now() - executionStartTime;
      xtermTerminal.writeln(`\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
      if (executionTime > 500) {
        xtermTerminal.writeln(`\x1b[90m[Execution time: ${executionTime}ms]\x1b[0m`);
      }
      // Ensure prompt is shown after error
      xtermTerminal.write(`${tab.currentDirectory}$ `);
    }
  };

  // Close a terminal tab
  const closeTerminal = useCallback((tabId: string) => {
    setTerminals(prev => {
      const newTerminals = prev.filter(t => t.id !== tabId);
      const closedTerminal = prev.find(t => t.id === tabId);
      
      if (closedTerminal) {
        // Send cleanup signal and dispose
        closedTerminal.terminal.writeln('\x1b[33m[Terminal session closing...]\x1b[0m');
        setTimeout(() => {
          closedTerminal.terminal.dispose();
        }, 500);
      }

      // Set active terminal to another tab if current was closed
      if (activeTerminalId === tabId && newTerminals.length > 0) {
        setActiveTerminalId(newTerminals[0].id);
      } else if (newTerminals.length === 0) {
        setActiveTerminalId(null);
      }

      return newTerminals;
    });
  }, [activeTerminalId]);

  // Close all terminals
  const closeAllTerminals = useCallback(() => {
    terminals.forEach(tab => {
      tab.terminal.writeln('\x1b[33m[Closing all terminal sessions...]\x1b[0m');
      tab.terminal.dispose();
    });
    setTerminals([]);
    setActiveTerminalId(null);
  }, [terminals]);

  // Rename terminal tab
  const renameTerminal = useCallback((tabId: string, newTitle: string) => {
    setTerminals(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, title: newTitle || `Terminal ${terminals.length}` } : tab
    ));
  }, [terminals.length]);

  // Copy selected text
  const copySelection = useCallback(() => {
    if (activeTerminal) {
      const selection = activeTerminal.terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  }, [activeTerminal]);

  // Paste from clipboard
  const pasteFromClipboard = useCallback(async () => {
    if (activeTerminal) {
      try {
        const text = await navigator.clipboard.readText();
        activeTerminal.terminal.write(text);
      } catch (error) {
        console.error('Failed to read clipboard:', error);
      }
    }
  }, [activeTerminal]);

  // Maximize/minimize terminal
  const toggleMaximize = useCallback(() => {
    setIsMaximized(prev => !prev);
  }, []);

  // Initialize first terminal
  useEffect(() => {
    if (vmId && terminals.length === 0) {
      createTerminal();
    }
  }, [vmId, createTerminal, terminals.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup all terminals
      terminals.forEach(tab => {
        tab.terminal.dispose();
      });
    };
  }, []);

  return (
    <div className={cn(
      "flex flex-col h-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg overflow-hidden",
      isMaximized && "fixed inset-4 z-50",
      className
    )}>
      {/* Terminal Tabs */}
      <div className="flex items-center justify-between bg-[#2d2d30] border-b border-[#3c3c3c] px-2">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {terminals.map((tab, index) => (
            <div
              key={tab.id}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-t-lg cursor-pointer min-w-0 group relative",
                "border-b-2 transition-all duration-200",
                activeTerminalId === tab.id 
                  ? "bg-[#1e1e1e] text-[#cccccc] border-[#007acc]" 
                  : "bg-[#2d2d30] text-[#8e8e8e] border-transparent hover:bg-[#37373d] hover:text-[#cccccc]"
              )}
              onClick={() => setActiveTerminalId(tab.id)}
              title={`Terminal ${index + 1} - ${tab.currentDirectory}`}
            >
              <TerminalIcon size={14} className={cn(
                activeTerminalId === tab.id ? "text-[#007acc]" : "text-[#8e8e8e]"
              )} />
              <span className="text-sm truncate max-w-[120px]">{tab.title}</span>
              
              {/* Session indicator */}
              <div className="w-2 h-2 rounded-full bg-[#4CAF50] opacity-60" title="Session active" />
              
              {terminals.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(tab.id);
                  }}
                  className="p-0.5 hover:bg-[#e81123] rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="Close terminal"
                >
                  <X size={12} className="text-[#cccccc]" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Terminal Controls */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copySelection}
            disabled={!activeTerminal}
            className="h-8 w-8 p-0 hover:bg-[#37373d]"
            title="Copy"
          >
            <Copy size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={pasteFromClipboard}
            disabled={!activeTerminal}
            className="h-8 w-8 p-0 hover:bg-[#37373d]"
            title="Paste"
          >
            <Clipboard size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMaximize}
            className="h-8 w-8 p-0 hover:bg-[#37373d]"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={createTerminal}
            disabled={!vmId}
            className="h-8 w-8 p-0 hover:bg-[#37373d]"
            title="New Terminal"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        {activeTerminal ? (
          <div 
            ref={terminalContainerRef}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#8e8e8e]">
            <div className="text-center">
              <TerminalIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">No active terminal</p>
              <Button
                onClick={createTerminal}
                disabled={!vmId}
                className="mt-4"
                size="sm"
              >
                <Plus size={16} className="mr-2" />
                New Terminal
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {activeTerminal && (
        <div className="bg-[#007acc] text-white text-xs px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" title="Connected" />
              <span className="font-medium">{activeTerminal.title}</span>
            </span>
            <span className="text-[#E1E1E1]">{activeTerminal.currentDirectory}</span>
          </div>
          <div className="flex items-center space-x-4 text-[#E1E1E1]">
            <span title="Current directory">
              📁 {activeTerminal.terminal?.cols}×{activeTerminal.terminal?.rows}
            </span>
            <span title="Session ID">
              ID: {activeTerminal.sessionId.substring(0, 8)}...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Terminal;
