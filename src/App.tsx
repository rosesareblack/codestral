import { useEffect, useState, useRef } from 'react'
import { IDELayout } from './components/ide/IDELayout'
import { AuthForm } from './components/auth/AuthForm'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { workspaceService } from './services/WorkspaceService'
import './App.css'

const AppContent = () => {
  const { user, loading } = useAuth();
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);
  const initializationStarted = useRef(false);

  useEffect(() => {
    // Initialize default workspace on app startup when user is authenticated
    const initWorkspace = async () => {
      if (!user || initializationStarted.current) return;
      
      initializationStarted.current = true;

      try {
        console.log('[App] Starting workspace initialization...');
        
        // Check if a workspace already exists
        const workspaces = await workspaceService.getAllWorkspaces();
        
        if (workspaces.length === 0) {
          // Create a default workspace
          console.log('[App] No workspaces found, creating default...');
          await workspaceService.createWorkspace(
            'My Workspace',
            'Default development workspace',
            'javascript'
          );
          console.log('[App] Default workspace created');
        } else {
          // Set the first workspace as current
          console.log('[App] Found existing workspaces, setting current...');
          await workspaceService.setCurrentWorkspace(workspaces[0].id);
          console.log('[App] Loaded existing workspace:', workspaces[0].name);
        }
        
        setWorkspaceInitialized(true);
        console.log('[App] Workspace initialization complete');
      } catch (error) {
        console.error('[App] Failed to initialize workspace:', error);
        setWorkspaceInitialized(true); // Set to true even on error to prevent infinite retries
      }
    };

    if (user && !loading && !workspaceInitialized) {
      initWorkspace();
    }
  }, [user, loading, workspaceInitialized]);

  // Reset initialization when user changes
  useEffect(() => {
    if (!user) {
      initializationStarted.current = false;
      setWorkspaceInitialized(false);
    }
  }, [user]);

  // Show loading screen while checking authentication or initializing workspace
  if (loading || (user && !workspaceInitialized)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">
            {loading ? 'Loading Codestral IDE...' : 'Initializing workspace...'}
          </p>
        </div>
      </div>
    );
  }

  // Show auth form if user is not authenticated
  if (!user) {
    return <AuthForm onAuthSuccess={() => {
      console.log('[App] Authentication successful');
    }} />;
  }

  // Show IDE if user is authenticated and workspace is initialized
  return (
    <div className="App">
      <IDELayout />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App