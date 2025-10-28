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
        const { action, code, prompt, language = 'typescript', messages = [] } = await req.json();

        // Get Codestral API key from environment
        const codestralApiKey = Deno.env.get('CODESTRAL_API_KEY');
        if (!codestralApiKey) {
            throw new Error('Codestral API key not configured');
        }

        let result;

        switch (action) {
            case 'generateCode':
                result = await generateCode(codestralApiKey, prompt, language);
                break;
            case 'debugCode':
                result = await debugCode(codestralApiKey, code, prompt);
                break;
            case 'explainCode':
                result = await explainCode(codestralApiKey, code);
                break;
            case 'chat':
                result = await chatWithAI(codestralApiKey, messages, prompt);
                break;
            case 'completeCode':
                result = await completeCode(codestralApiKey, code, language);
                break;
            default:
                throw new Error(`Unsupported action: ${action}`);
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Codestral AI error:', error);

        const errorResponse = {
            error: {
                code: 'CODESTRAL_AI_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

async function generateCode(apiKey: string, prompt: string, language: string) {
    const response = await fetch('https://codestral.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'codestral-latest',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert ${language} developer. Generate clean, efficient, and well-documented code based on the user's requirements. Always include proper error handling and follow best practices.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Codestral API error: ${errorData}`);
    }

    const data = await response.json();
    return {
        code: data.choices[0]?.message?.content || '',
        explanation: 'Code generated successfully'
    };
}

async function debugCode(apiKey: string, code: string, issue: string) {
    const response = await fetch('https://codestral.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'codestral-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert code debugger. Analyze the provided code and help identify and fix issues. Provide clear explanations and corrected code.'
                },
                {
                    role: 'user',
                    content: `Here's the code with an issue:\n\n\`\`\`\n${code}\n\`\`\`\n\nIssue: ${issue}\n\nPlease identify the problem and provide a fixed version with explanation.`
                }
            ],
            temperature: 0.1,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Codestral API error: ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    return {
        explanation: content,
        suggestions: ['Review the fixed code above', 'Test the solution', 'Consider edge cases']
    };
}

async function explainCode(apiKey: string, code: string) {
    const response = await fetch('https://codestral.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'codestral-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert code explainer. Analyze the provided code and explain what it does, how it works, and any important concepts or patterns used.'
                },
                {
                    role: 'user',
                    content: `Please explain this code:\n\n\`\`\`\n${code}\n\`\`\``
                }
            ],
            temperature: 0.1,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Codestral API error: ${errorData}`);
    }

    const data = await response.json();
    return {
        explanation: data.choices[0]?.message?.content || ''
    };
}

async function chatWithAI(apiKey: string, messages: any[], newMessage: string) {
    const chatMessages = [
        {
            role: 'system',
            content: 'You are Codestral, an AI coding assistant. Help users with programming questions, code review, debugging, and development best practices. Be concise but thorough in your responses.'
        },
        ...messages,
        {
            role: 'user',
            content: newMessage
        }
    ];

    const response = await fetch('https://codestral.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'codestral-latest',
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Codestral API error: ${errorData}`);
    }

    const data = await response.json();
    return {
        response: data.choices[0]?.message?.content || '',
        timestamp: new Date().toISOString()
    };
}

async function completeCode(apiKey: string, code: string, language: string) {
    // Use FIM (Fill-in-the-Middle) endpoint for code completion
    const response = await fetch('https://codestral.mistral.ai/v1/fim/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'codestral-latest',
            prompt: code,
            suffix: '',
            temperature: 0.1,
            max_tokens: 500,
            stop: ['\n\n']
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Codestral API error: ${errorData}`);
    }

    const data = await response.json();
    return {
        completion: data.choices[0]?.message?.content || data.choices[0]?.text || '',
        timestamp: new Date().toISOString()
    };
}