# Codestral IDE

A comprehensive, AI-powered development environment built with React and TypeScript, featuring Monaco Editor, real-time AI assistance, and Firecracker VM integration.

## Features

- **Modern IDE Interface**: Professional split-pane layout with file explorer, code editor, terminal, and AI chat
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting, auto-completion, and IntelliSense
- **Codestral AI Assistant**: Intelligent code generation, debugging, and explanations
- **Firecracker VM Integration**: Isolated development environments with secure execution
- **Real-time Collaboration**: Multiplayer editing and shared sessions
- **Terminal Integration**: Full terminal interface with command execution
- **Workspace Management**: Create, clone, and manage development environments
- **Professional UI/UX**: Built with Tailwind CSS and Radix UI components

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Code Editor**: Monaco Editor (powers VS Code)
- **UI Components**: Radix UI + Tailwind CSS
- **Terminal**: xterm.js
- **Build System**: Vite
- **Backend**: Supabase Edge Functions (ready for integration)
- **AI**: Codestral integration (mock implementation)
- **VM Management**: Firecracker micro-VMs (mock implementation)

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

### Development

```bash
# Run in development mode
pnpm dev

# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Preview production build
pnpm preview
```

## Project Structure

```
src/
├── components/
│   ├── ide/
│   │   ├── IDELayout.tsx      # Main IDE interface
│   │   ├── FileExplorer.tsx   # File system browser
│   │   ├── CodeEditor.tsx     # Monaco editor integration
│   │   ├── AIChat.tsx         # AI assistant interface
│   │   └── Terminal.tsx       # Terminal emulator
│   └── ErrorBoundary.tsx
├── services/
│   ├── CodestralAIService.ts  # AI code generation
│   ├── FileSystemService.ts   # File operations
│   ├── FirecrackerService.ts  # VM management
│   └── WorkspaceService.ts    # Workspace operations
├── types/
│   └── index.ts               # TypeScript definitions
└── App.tsx                    # Main application
```

## Features Overview

### Code Editor
- Syntax highlighting for 20+ languages
- Auto-completion and IntelliSense
- Multiple file tabs
- Split editor view
- Code formatting and linting
- Full-screen mode

### AI Assistant
- Code generation in multiple languages
- Debugging assistance and error analysis
- Code explanation and optimization suggestions
- Context-aware responses based on current file
- Professional chat interface

### File Management
- Tree-view file explorer
- Create, rename, delete files and folders
- Drag and drop support
- Language detection and icon mapping
- Real-time file updates

### Terminal
- xterm.js integration
- Command execution via Firecracker VMs
- Multiple terminal sessions
- Copy/paste functionality
- Command history and autocomplete

### Workspace Management
- Create workspaces from templates (JavaScript, TypeScript, Python)
- Clone and snapshot workspaces
- Firecracker VM integration
- Persistent file storage

## Deployment

This project is configured for Vercel deployment:

```bash
# Deploy to Vercel
vercel

# Or build and deploy manually
pnpm build
vercel --prod
```

### Environment Variables

No environment variables required for basic functionality. The application uses mock services that can be easily replaced with real implementations.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Monaco Editor team for the excellent code editor
- Vercel for the deployment platform
- Supabase for the backend infrastructure
- Radix UI for the component library