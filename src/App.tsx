import { useEffect } from 'react'
import { IDELayout } from './components/ide/IDELayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { workspaceService } from './services/WorkspaceService'
import './App.css'

function App() {
  useEffect(() => {
    // Initialize default workspace on app startup
    const initWorkspace = async () => {
      try {
        // Check if a workspace already exists
        const currentWorkspace = workspaceService.getCurrentWorkspace()
        
        if (!currentWorkspace) {
          // Create a default workspace
          await workspaceService.createWorkspace(
            'My Workspace',
            'Default development workspace',
            'javascript'
          )
          console.log('[App] Default workspace created')
        }
      } catch (error) {
        console.error('[App] Failed to initialize workspace:', error)
      }
    }

    initWorkspace()
  }, [])

  return (
    <ErrorBoundary>
      <div className="App">
        <IDELayout />
      </div>
    </ErrorBoundary>
  )
}

export default App
