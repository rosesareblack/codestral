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
        const { code, language, input = '', timeout = 10000 } = await req.json();

        if (!code || !language) {
            throw new Error('Code and language are required');
        }

        // Get user from auth header for logging
        const authHeader = req.headers.get('authorization');
        let userId = 'anonymous';
        
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const supabaseUrl = Deno.env.get('SUPABASE_URL');
                const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

                const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    userId = userData.id;
                }
            } catch (error) {
                console.warn('Could not get user from auth header:', error);
            }
        }

        const startTime = Date.now();
        let result;

        try {
            result = await executeCode(code, language, input, timeout);
        } catch (error) {
            result = {
                success: false,
                output: '',
                error: error.message,
                executionTime: Date.now() - startTime
            };
        }

        // Store execution result in database
        try {
            await storeExecutionResult(userId, code, result);
        } catch (error) {
            console.warn('Failed to store execution result:', error);
            // Don't fail the request if storage fails
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Code execution error:', error);

        const errorResponse = {
            error: {
                code: 'CODE_EXECUTION_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

async function executeCode(code: string, language: string, input: string, timeout: number) {
    const startTime = Date.now();

    try {
        switch (language.toLowerCase()) {
            case 'javascript':
            case 'js':
                return await executeJavaScript(code, input, timeout);
            case 'typescript':
            case 'ts':
                return await executeTypeScript(code, input, timeout);
            case 'python':
            case 'py':
                return await executePython(code, input, timeout);
            case 'html':
                return await executeHTML(code);
            case 'css':
                return await executeCSS(code);
            case 'json':
                return await validateJSON(code);
            default:
                return {
                    success: false,
                    output: '',
                    error: `Language '${language}' not supported. Supported languages: JavaScript, TypeScript, Python, HTML, CSS, JSON`,
                    executionTime: Date.now() - startTime
                };
        }
    } catch (error) {
        return {
            success: false,
            output: '',
            error: error.message,
            executionTime: Date.now() - startTime
        };
    }
}

async function executeJavaScript(code: string, input: string, timeout: number): Promise<any> {
    const startTime = Date.now();
    
    // Create a safe execution context
    const safeCode = `
        const console = {
            log: (...args) => self.postMessage({type: 'log', args}),
            error: (...args) => self.postMessage({type: 'error', args}),
            warn: (...args) => self.postMessage({type: 'warn', args})
        };
        
        const input = ${JSON.stringify(input)};
        let output = [];
        
        // Capture console output
        const originalLog = console.log;
        console.log = (...args) => {
            output.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
        };
        
        try {
            // Execute user code
            const result = (function() {
                ${code}
            })();
            
            if (result !== undefined) {
                output.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
            }
            
            self.postMessage({
                type: 'result',
                success: true,
                output: output.join('\\n'),
                executionTime: ${Date.now()} - ${startTime}
            });
        } catch (error) {
            self.postMessage({
                type: 'result',
                success: false,
                output: output.join('\\n'),
                error: error.message,
                executionTime: ${Date.now()} - ${startTime}
            });
        }
    `;

    // For security, we'll execute in a limited way
    // In a real production environment, you'd want to use a proper sandboxed execution environment
    try {
        // Simple evaluation for basic JavaScript
        const capturedOutput: string[] = [];
        const capturedErrors: string[] = [];
        
        // Override console for capture
        const originalConsole = globalThis.console;
        globalThis.console = {
            ...originalConsole,
            log: (...args: any[]) => {
                capturedOutput.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
            },
            error: (...args: any[]) => {
                capturedErrors.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
            },
            warn: (...args: any[]) => {
                capturedOutput.push('WARN: ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
            }
        };

        // Add input variable to scope
        const wrappedCode = `
            const input = ${JSON.stringify(input)};
            ${code}
        `;

        const result = eval(wrappedCode);
        
        // Restore console
        globalThis.console = originalConsole;
        
        let output = capturedOutput.join('\n');
        if (result !== undefined) {
            output += (output ? '\n' : '') + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
        }

        return {
            success: capturedErrors.length === 0,
            output,
            error: capturedErrors.join('\n') || null,
            executionTime: Date.now() - startTime
        };
        
    } catch (error) {
        return {
            success: false,
            output: '',
            error: error.message,
            executionTime: Date.now() - startTime
        };
    }
}

async function executeTypeScript(code: string, input: string, timeout: number) {
    // For now, treat TypeScript as JavaScript (in a real implementation, you'd transpile first)
    return await executeJavaScript(code, input, timeout);
}

async function executePython(code: string, input: string, timeout: number) {
    // Python execution would require a Python runtime
    // For now, return a placeholder response
    return {
        success: false,
        output: '',
        error: 'Python execution not yet implemented. This would require a Python runtime in the edge function environment.',
        executionTime: 0
    };
}

async function executeHTML(code: string) {
    // Validate HTML syntax
    try {
        // Basic HTML validation - check for balanced tags
        const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
        const tags: string[] = [];
        let match;
        
        while ((match = tagPattern.exec(code)) !== null) {
            const tagName = match[1].toLowerCase();
            const isClosing = match[0].startsWith('</');
            
            if (isClosing) {
                if (tags.length === 0 || tags.pop() !== tagName) {
                    throw new Error(`Unmatched closing tag: ${match[0]}`);
                }
            } else if (!match[0].endsWith('/>')) {
                // Self-closing tags like <br/>, <img/> don't need closing tags
                const selfClosingTags = ['br', 'img', 'input', 'meta', 'link', 'hr', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
                if (!selfClosingTags.includes(tagName)) {
                    tags.push(tagName);
                }
            }
        }
        
        if (tags.length > 0) {
            throw new Error(`Unclosed tags: ${tags.join(', ')}`);
        }
        
        return {
            success: true,
            output: 'HTML syntax is valid',
            error: null,
            executionTime: 0
        };
    } catch (error) {
        return {
            success: false,
            output: '',
            error: error.message,
            executionTime: 0
        };
    }
}

async function executeCSS(code: string) {
    // Basic CSS validation
    try {
        // Simple CSS syntax check
        const braceCount = (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;
        if (braceCount !== 0) {
            throw new Error('Unmatched braces in CSS');
        }
        
        return {
            success: true,
            output: 'CSS syntax appears valid',
            error: null,
            executionTime: 0
        };
    } catch (error) {
        return {
            success: false,
            output: '',
            error: error.message,
            executionTime: 0
        };
    }
}

async function validateJSON(code: string) {
    try {
        const parsed = JSON.parse(code);
        return {
            success: true,
            output: `Valid JSON with ${typeof parsed === 'object' ? Object.keys(parsed).length : 0} properties`,
            error: null,
            executionTime: 0
        };
    } catch (error) {
        return {
            success: false,
            output: '',
            error: error.message,
            executionTime: 0
        };
    }
}

async function storeExecutionResult(userId: string, code: string, result: any) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase configuration missing');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/execution_results`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            workspace_id: null, // Will be updated when workspace context is available
            code: code.length > 1000 ? code.substring(0, 1000) + '...' : code,
            output: result.output || '',
            status: result.success ? 'success' : 'error',
            execution_time_ms: result.executionTime || 0
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to store execution result: ${errorText}`);
    }
}