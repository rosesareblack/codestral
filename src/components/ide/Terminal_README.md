# Terminal Component

A fully-featured terminal emulator built with xterm.js for the CodeStral IDE.

## Features

### Core Functionality
- **xterm.js Integration**: Full-featured terminal emulator using xterm.js library
- **Firecracker VM Support**: Execute commands through firecrackerService
- **Multiple Sessions**: Support for multiple terminal tabs with independent sessions
- **Streaming Output**: Real-time command output streaming with syntax highlighting
- **Session Management**: Proper cleanup and resource disposal

### User Interface
- **VS Code-inspired Theme**: Professional dark theme with custom color scheme
- **Tabbed Interface**: Multiple terminal sessions with visual indicators
- **Responsive Design**: Automatically fits to container size with debounced resize
- **Maximizable**: Full-screen terminal support with minimize/maximize controls
- **Status Bar**: Real-time session info, directory, dimensions, and session ID
- **Welcome Message**: Informative startup message with quick tips

### Terminal Operations
- **Command History**: Up/down arrow navigation through persistent command history
- **Smart Auto-completion**: Tab completion with 40+ commands and suggestions
- **Copy/Paste**: Selection-based copy and clipboard paste with Ctrl+C/V support
- **Keyboard Shortcuts**: 
  - Ctrl+C (interrupt), Ctrl+L (clear), Ctrl+W (delete word), Ctrl+K (clear line)
  - Arrow keys for history navigation, Tab for autocomplete
- **Syntax Highlighting**: Color-coded output (errors in red, warnings in yellow, success in green)

### Built-in Commands
- `help` - Show comprehensive help with keyboard shortcuts and tips
- `clear` - Clear terminal screen with visual feedback
- `history` - Show command history with line numbers
- `cd <path>` - Change directory
- All other commands execute through Firecracker VM

## Usage

```tsx
import { Terminal } from '@/components/ide/Terminal';

// Basic usage
<Terminal 
  vmId="vm-123" 
  workspaceId="workspace-456"
  onSessionCreate={(session) => console.log('Session created:', session)}
/>

// With custom styling
<Terminal 
  vmId="vm-123"
  workspaceId="workspace-456"
  className="h-96"
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `vmId` | `string` | Yes | The ID of the Firecracker VM to execute commands on |
| `workspaceId` | `string` | Yes | The workspace ID for session tracking |
| `onSessionCreate` | `(session: TerminalSession) => void` | No | Callback when a new terminal session is created |
| `className` | `string` | No | Additional CSS classes |

## Keyboard Shortcuts

### Navigation & Editing
- **Enter**: Execute command
- **Up/Down Arrow**: Navigate command history (with visual feedback)
- **Tab**: Auto-complete command with suggestions
- **Backspace**: Delete previous character

### Control & Session
- **Ctrl+C**: Interrupt current command
- **Ctrl+L**: Clear terminal screen with welcome message
- **Ctrl+W**: Delete previous word
- **Ctrl+K**: Clear to end of line
- **Right Click**: Context menu with copy/paste options

### UI Controls
- **Click Tab**: Switch between terminal sessions
- **Click X**: Close terminal session
- **Plus Button**: Create new terminal session

## Terminal Features

### Commands Auto-completion
The terminal supports comprehensive auto-completion for 40+ commands:

#### File Operations
- `ls`, `ls -la`, `ls -l`, `pwd`, `cd`, `cd ..`, `cd ~`
- `mkdir`, `rmdir`, `rm`, `rm -rf`, `cp`, `cp -r`, `mv`
- `touch`, `cat`, `less`, `more`, `head`, `tail`
- `find`, `find . -name`, `grep`, `grep -r`

#### Development Tools
- `node`, `node --version`, `npm`, `npm --version`, `npm install`, `npm run`
- `yarn`, `yarn --version`, `pnpm`, `pnpm --version`, `npx`
- `python`, `python --version`, `python3`, `python3 --version`, `pip`, `pip3`
- `git`, `git --version`, `git status`, `git add`, `git commit`, `git push`
- `git pull`, `git clone`, `git checkout`, `git branch`, `git log`, `git diff`

#### System Utilities
- `whoami`, `which`, `whereis`, `top`, `ps`, `ps aux`
- `df -h`, `free -h`, `uname -a`, `history`, `clear`

#### Process Management
- `kill`, `killall`, `jobs`, `bg`, `fg`, `&`, `nohup`

#### Network & Archive
- `curl`, `wget`, `ping`, `ssh`, `scp`
- `tar`, `tar -czf`, `tar -xzf`, `zip`, `unzip`

#### Text Processing
- `sed`, `awk`, `sort`, `uniq`, `wc`, `cut`, `tr`

### Command History
- Navigate through command history with arrow keys
- History is maintained per terminal session
- Maximum 100 commands stored in history

### Streaming Output & Visual Enhancements
- **Real-time Streaming**: Commands output streamed with simulated delay
- **Syntax Highlighting**: 
  - Red for errors and failures
  - Yellow for warnings
  - Green for success and completion
  - Cyan for arrows and pointers
- **Execution Time**: Shows execution time for slower commands (>1 second)
- **Session Indicators**: Visual dots showing active sessions
- **Professional UI**: Enhanced tab styling with hover effects
- **Better Feedback**: Improved prompts and visual responses

## Technical Details

### Dependencies
- `xterm`: Core terminal emulator
- `xterm-addon-fit`: Terminal fitting to container
- `xterm-addon-web-links`: Web link detection and clicking

### Theme
- Background: `#1e1e1e`
- Foreground: `#d4d4d4`
- Syntax highlighting for different output types
- VS Code color scheme

### Component Structure
```
Terminal/
├── Tab Bar (session management)
│   ├── Terminal Tabs
│   └── Controls (copy, paste, maximize, new)
├── Terminal Container (xterm.js instance)
└── Status Bar (current directory, dimensions)
```

## Session Management

Each terminal tab represents a separate session with:
- Unique session ID
- Independent command history
- Separate working directory
- Isolated output buffer

## Example Integration

```tsx
import { useState } from 'react';
import { Terminal } from '@/components/ide/Terminal';
import { firecrackerService } from '@/services/FirecrackerService';

function MyIDE() {
  const [vmId, setVmId] = useState<string | null>(null);
  
  const handleSessionCreate = (session) => {
    console.log('Terminal session created:', session);
    // Store session for later use
  };

  return (
    <div className="flex h-screen">
      <FileExplorer />
      <div className="flex-1">
        <CodeEditor />
        <Terminal 
          vmId={vmId || 'default-vm'}
          workspaceId="my-workspace"
          onSessionCreate={handleSessionCreate}
        />
      </div>
    </div>
  );
}
```

## Error Handling

- VM not running errors are caught and displayed in red
- Failed command executions show error messages
- Disconnected sessions show appropriate messages

## Performance

- Efficient canvas-based rendering
- Scrollback buffer limit: 1000 lines
- Automatic cleanup on tab close
- Resize event throttling
