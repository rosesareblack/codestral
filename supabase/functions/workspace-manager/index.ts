Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { action, workspaceId, userId, ...params } = await req.json();

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Verify token and get user
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid token');
        }

        const userData = await userResponse.json();
        const currentUserId = userData.id;

        let result;

        switch (action) {
            case 'createWorkspace':
                result = await createWorkspace(currentUserId, params);
                break;
            case 'getWorkspace':
                result = await getWorkspace(workspaceId, currentUserId);
                break;
            case 'listWorkspaces':
                result = await listWorkspaces(currentUserId);
                break;
            case 'updateWorkspace':
                result = await updateWorkspace(workspaceId, currentUserId, params);
                break;
            case 'deleteWorkspace':
                result = await deleteWorkspace(workspaceId, currentUserId);
                break;
            case 'createSnapshot':
                result = await createSnapshot(workspaceId, currentUserId, params);
                break;
            case 'listSnapshots':
                result = await listSnapshots(workspaceId, currentUserId);
                break;
            case 'restoreSnapshot':
                result = await restoreSnapshot(workspaceId, currentUserId, params.snapshotId);
                break;
            default:
                throw new Error(`Unsupported action: ${action}`);
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Workspace manager error:', error);

        const errorResponse = {
            error: {
                code: 'WORKSPACE_MANAGER_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

async function createWorkspace(userId: string, params: any) {
    const { name, description = '', template = 'blank', settings = {} } = params;

    if (!name) {
        throw new Error('Workspace name is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Create workspace in database
    const workspaceResponse = await fetch(`${supabaseUrl}/rest/v1/workspaces`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            user_id: userId,
            name,
            description,
            template,
            settings: JSON.stringify(settings)
        })
    });

    if (!workspaceResponse.ok) {
        const errorText = await workspaceResponse.text();
        throw new Error(`Failed to create workspace: ${errorText}`);
    }

    const workspaceData = await workspaceResponse.json();
    const workspace = workspaceData[0];

    // Create default files based on template
    await createTemplateFiles(workspace.id, template);

    return {
        workspace,
        message: 'Workspace created successfully'
    };
}

async function getWorkspace(workspaceId: string, userId: string) {
    if (!workspaceId) {
        throw new Error('Workspace ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Get workspace
    const workspaceResponse = await fetch(`${supabaseUrl}/rest/v1/workspaces?id=eq.${workspaceId}&user_id=eq.${userId}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!workspaceResponse.ok) {
        throw new Error('Failed to get workspace');
    }

    const workspaces = await workspaceResponse.json();
    if (workspaces.length === 0) {
        throw new Error('Workspace not found or access denied');
    }

    const workspace = workspaces[0];

    // Get workspace files
    const filesResponse = await fetch(`${supabaseUrl}/rest/v1/files?workspace_id=eq.${workspaceId}&order=path.asc`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    const files = filesResponse.ok ? await filesResponse.json() : [];

    return {
        workspace,
        files,
        fileCount: files.length
    };
}

async function listWorkspaces(userId: string) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const response = await fetch(`${supabaseUrl}/rest/v1/workspaces?user_id=eq.${userId}&order=created_at.desc`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!response.ok) {
        throw new Error('Failed to list workspaces');
    }

    const workspaces = await response.json();

    // Get file counts for each workspace
    for (const workspace of workspaces) {
        const filesResponse = await fetch(`${supabaseUrl}/rest/v1/files?workspace_id=eq.${workspace.id}&select=id`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (filesResponse.ok) {
            const files = await filesResponse.json();
            workspace.file_count = files.length;
        } else {
            workspace.file_count = 0;
        }
    }

    return {
        workspaces,
        total: workspaces.length
    };
}

async function updateWorkspace(workspaceId: string, userId: string, params: any) {
    const { name, description, settings } = params;

    if (!workspaceId) {
        throw new Error('Workspace ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (settings) updateData.settings = JSON.stringify(settings);

    const response = await fetch(`${supabaseUrl}/rest/v1/workspaces?id=eq.${workspaceId}&user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update workspace: ${errorText}`);
    }

    const updatedWorkspace = await response.json();

    return {
        workspace: updatedWorkspace[0],
        message: 'Workspace updated successfully'
    };
}

async function deleteWorkspace(workspaceId: string, userId: string) {
    if (!workspaceId) {
        throw new Error('Workspace ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Delete workspace files first
    await fetch(`${supabaseUrl}/rest/v1/files?workspace_id=eq.${workspaceId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    // Delete chat history
    await fetch(`${supabaseUrl}/rest/v1/chat_history?workspace_id=eq.${workspaceId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    // Delete execution results
    await fetch(`${supabaseUrl}/rest/v1/execution_results?workspace_id=eq.${workspaceId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    // Delete workspace
    const response = await fetch(`${supabaseUrl}/rest/v1/workspaces?id=eq.${workspaceId}&user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!response.ok) {
        throw new Error('Failed to delete workspace');
    }

    return {
        message: 'Workspace deleted successfully'
    };
}

async function createSnapshot(workspaceId: string, userId: string, params: any) {
    const { name = `Snapshot ${new Date().toISOString()}` } = params;

    // Get all workspace files
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const filesResponse = await fetch(`${supabaseUrl}/rest/v1/files?workspace_id=eq.${workspaceId}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!filesResponse.ok) {
        throw new Error('Failed to get workspace files');
    }

    const files = await filesResponse.json();

    // Create snapshot data
    const snapshotData = {
        name,
        workspaceId,
        files,
        createdAt: new Date().toISOString(),
        userId
    };

    // Store snapshot in storage bucket
    const snapshotJson = JSON.stringify(snapshotData, null, 2);
    const snapshotFileName = `${workspaceId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;

    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/workspace-backups/${snapshotFileName}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'x-upsert': 'true'
        },
        body: snapshotJson
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Failed to store snapshot: ${errorText}`);
    }

    return {
        snapshotId: snapshotFileName,
        name,
        fileCount: files.length,
        message: 'Snapshot created successfully'
    };
}

async function listSnapshots(workspaceId: string, userId: string) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // List files in the workspace backup folder
    const response = await fetch(`${supabaseUrl}/storage/v1/object/list/workspace-backups?prefix=${workspaceId}/`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to list snapshots');
    }

    const files = await response.json();

    const snapshots = files
        .filter((file: any) => file.name.endsWith('.json'))
        .map((file: any) => ({
            id: `${workspaceId}/${file.name}`,
            name: file.name.replace(/^\d+-/, '').replace(/\.json$/, '').replace(/_/g, ' '),
            size: file.metadata?.size || 0,
            createdAt: new Date(file.created_at).toISOString()
        }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
        snapshots,
        total: snapshots.length
    };
}

async function restoreSnapshot(workspaceId: string, userId: string, snapshotId: string) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Download snapshot
    const downloadResponse = await fetch(`${supabaseUrl}/storage/v1/object/workspace-backups/${snapshotId}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`
        }
    });

    if (!downloadResponse.ok) {
        throw new Error('Failed to download snapshot');
    }

    const snapshotData = await downloadResponse.json();

    // Delete existing files
    await fetch(`${supabaseUrl}/rest/v1/files?workspace_id=eq.${workspaceId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    // Restore files from snapshot
    if (snapshotData.files && snapshotData.files.length > 0) {
        for (const file of snapshotData.files) {
            const { id, ...fileData } = file; // Remove id to let database generate new one
            
            await fetch(`${supabaseUrl}/rest/v1/files`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...fileData,
                    workspace_id: workspaceId
                })
            });
        }
    }

    return {
        message: 'Snapshot restored successfully',
        restoredFiles: snapshotData.files?.length || 0
    };
}

async function createTemplateFiles(workspaceId: string, template: string) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    let templateFiles: any[] = [];

    switch (template) {
        case 'react':
            templateFiles = [
                { path: 'src/App.tsx', content: `import React from 'react';\n\nfunction App() {\n  return (\n    <div className="App">\n      <h1>Hello React!</h1>\n    </div>\n  );\n}\n\nexport default App;`, file_type: 'typescript' },
                { path: 'src/index.tsx', content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root')!);\nroot.render(<App />);`, file_type: 'typescript' },
                { path: 'package.json', content: `{\n  "name": "react-app",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  }\n}`, file_type: 'json' }
            ];
            break;
        case 'nodejs':
            templateFiles = [
                { path: 'index.js', content: `const express = require('express');\nconst app = express();\nconst port = 3000;\n\napp.get('/', (req, res) => {\n  res.send('Hello World!');\n});\n\napp.listen(port, () => {\n  console.log(\`Server running at http://localhost:\${port}\`);\n});`, file_type: 'javascript' },
                { path: 'package.json', content: `{\n  "name": "nodejs-app",\n  "version": "1.0.0",\n  "main": "index.js",\n  "dependencies": {\n    "express": "^4.18.0"\n  }\n}`, file_type: 'json' }
            ];
            break;
        case 'python':
            templateFiles = [
                { path: 'main.py', content: `def main():\n    print("Hello World!")\n\nif __name__ == "__main__":\n    main()`, file_type: 'python' },
                { path: 'requirements.txt', content: '# Add your dependencies here', file_type: 'text' }
            ];
            break;
        default: // blank
            templateFiles = [
                { path: 'README.md', content: `# New Workspace\n\nWelcome to your new coding workspace!\n\nStart by creating files and writing code.`, file_type: 'markdown' }
            ];
    }

    // Create files in database
    for (const file of templateFiles) {
        await fetch(`${supabaseUrl}/rest/v1/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workspace_id: workspaceId,
                path: file.path,
                content: file.content,
                file_type: file.file_type,
                size_bytes: file.content.length
            })
        });
    }
}