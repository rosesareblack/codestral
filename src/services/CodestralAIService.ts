import { AIMessage, CodeBlock } from '@/types';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://dmexmkktelxxnxeckluk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZXhta2t0ZWx4eG54ZWNrbHVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Mjk5MjgsImV4cCI6MjA3NzEwNTkyOH0.CiMnJHWNuzqW3q5Y_XQeo-hZz9b7doV95kjFcLF0Wl4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class CodestralAIService {
  private conversationHistory: AIMessage[] = [];
  private messageIdCounter = 0;

  async generateCode(prompt: string, language: string = 'javascript'): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('codestral-ai', {
        body: {
          action: 'generateCode',
          prompt,
          language
        }
      });

      if (error) {
        console.error('Codestral AI error:', error);
        throw new Error(`AI service error: ${error.message}`);
      }

      return data?.data?.code || 'Failed to generate code';
    } catch (error) {
      console.error('Code generation failed:', error);
      // Fallback to basic template if API fails
      return this.getFallbackCode(prompt, language);
    }
  }

  async chat(userMessage: string, context?: { code?: string; filePath?: string }): Promise<AIMessage> {
    const userMsg: AIMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    this.conversationHistory.push(userMsg);

    try {
      const { data, error } = await supabase.functions.invoke('codestral-ai', {
        body: {
          action: 'chat',
          prompt: userMessage,
          messages: this.conversationHistory.slice(-10) // Send last 10 messages for context
        }
      });

      if (error) {
        throw new Error(`AI service error: ${error.message}`);
      }

      const aiResponse = data?.data?.response || 'I apologize, but I encountered an issue processing your request.';
      
      const assistantMsg: AIMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      
      // Parse code blocks if they exist in the response
      assistantMsg.codeBlocks = this.extractCodeBlocks(aiResponse);
      
      this.conversationHistory.push(assistantMsg);
      return assistantMsg;
    } catch (error) {
      console.error('Chat failed:', error);
      
      // Fallback response
      const fallbackMsg: AIMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: "I'm experiencing technical difficulties. Please try again in a moment. In the meantime, I can help you with basic coding questions or provide code templates.",
        timestamp: new Date(),
      };
      
      this.conversationHistory.push(fallbackMsg);
      return fallbackMsg;
    }
  }

  async debugCode(code: string, error: string): Promise<string> {
    try {
      const { data, error: apiError } = await supabase.functions.invoke('codestral-ai', {
        body: {
          action: 'debugCode',
          code,
          prompt: error
        }
      });

      if (apiError) {
        throw new Error(`AI service error: ${apiError.message}`);
      }

      return data?.data?.explanation || 'Unable to analyze the code at this time.';
    } catch (error) {
      console.error('Debug failed:', error);
      return this.getFallbackDebugResponse(code, error as string);
    }
  }

  async explainCode(code: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('codestral-ai', {
        body: {
          action: 'explainCode',
          code
        }
      });

      if (error) {
        throw new Error(`AI service error: ${error.message}`);
      }

      return data?.data?.explanation || 'Unable to explain the code at this time.';
    } catch (error) {
      console.error('Code explanation failed:', error);
      return this.getFallbackExplanation(code);
    }
  }

  async suggestCompletion(code: string, cursorPosition: number): Promise<string[]> {
    try {
      const { data, error } = await supabase.functions.invoke('codestral-ai', {
        body: {
          action: 'completeCode',
          code: code.substring(0, cursorPosition),
          language: this.detectLanguageFromCode(code)
        }
      });

      if (error) {
        throw new Error(`AI service error: ${error.message}`);
      }

      const completion = data?.data?.completion || '';
      return completion ? [completion] : this.getFallbackCompletions(code, cursorPosition);
    } catch (error) {
      console.error('Code completion failed:', error);
      return this.getFallbackCompletions(code, cursorPosition);
    }
  }

  getConversationHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  // Save chat history to database
  async saveChatHistory(workspaceId: string): Promise<void> {
    if (!workspaceId || this.conversationHistory.length === 0) return;

    try {
      const { error } = await supabase
        .from('chat_history')
        .insert({
          workspace_id: workspaceId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          messages: this.conversationHistory
        });

      if (error) {
        console.error('Failed to save chat history:', error);
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  // Load chat history from database
  async loadChatHistory(workspaceId: string): Promise<void> {
    if (!workspaceId) return;

    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('messages')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to load chat history:', error);
        return;
      }

      if (data?.messages) {
        this.conversationHistory = data.messages;
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${this.messageIdCounter++}`;
  }

  private extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }

    return blocks;
  }

  private detectLanguageFromCode(code: string): string {
    // Simple language detection based on code patterns
    if (code.includes('import React') || code.includes('useState')) return 'typescript';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('package ') || code.includes('func ')) return 'go';
    if (code.includes('class ') && code.includes('public ')) return 'java';
    if (code.includes('interface ') || code.includes(': string')) return 'typescript';
    return 'javascript';
  }

  // Fallback methods for when API is not available
  private getFallbackCode(prompt: string, language: string): string {
    const templates: Record<string, string> = {
      javascript: `// Generated JavaScript code for: ${prompt}
function processData(input) {
  if (!input) {
    throw new Error('Input is required');
  }
  
  // TODO: Implement your logic here
  console.log('Processing:', input);
  return input;
}

// Usage
const result = processData('example');
console.log(result);`,
      
      typescript: `// Generated TypeScript code for: ${prompt}
interface DataInput {
  // TODO: Define your interface
  value: string;
}

function processData(input: DataInput): DataInput {
  if (!input) {
    throw new Error('Input is required');
  }
  
  // TODO: Implement your logic here
  console.log('Processing:', input);
  return input;
}

// Usage
const result = processData({ value: 'example' });
console.log(result);`,
      
      python: `# Generated Python code for: ${prompt}
def process_data(input_data):
    if not input_data:
        raise ValueError('Input is required')
    
    # TODO: Implement your logic here
    print(f'Processing: {input_data}')
    return input_data

# Usage
result = process_data('example')
print(result)`
    };

    return templates[language] || templates.javascript;
  }

  private getFallbackDebugResponse(code: string, error: string): string {
    return `**Debug Analysis** (Offline Mode)

**Issue**: ${error}

**Common Solutions**:
1. Check for undefined variables or null references
2. Verify function parameters and return types
3. Ensure all imports and dependencies are available
4. Add try-catch blocks for error handling

**Suggested Actions**:
- Add console.log statements to trace execution
- Check the browser/console for additional error details
- Verify all required libraries are imported
- Test with simplified input data

*Note: AI debugging service is temporarily unavailable. Please check your connection.*`;
  }

  private getFallbackExplanation(code: string): string {
    const lines = code.split('\n').length;
    const hasFunction = code.includes('function') || code.includes('=>');
    const hasClass = code.includes('class');
    const hasLoop = code.includes('for') || code.includes('while');

    return `**Code Analysis** (Offline Mode)

**Overview**: This code snippet contains ${lines} lines and appears to ${hasFunction ? 'define functions' : hasClass ? 'implement a class' : 'contain logic'}.

**Structure**:
${hasFunction ? '- Contains function definitions' : ''}
${hasClass ? '- Uses object-oriented programming' : ''}
${hasLoop ? '- Includes iterative processing' : ''}

**Recommendations**:
- Add comments to explain complex logic
- Consider error handling for edge cases
- Test with various input scenarios

*Note: AI explanation service is temporarily unavailable. Please check your connection.*`;
  }

  private getFallbackCompletions(code: string, cursorPosition: number): string[] {
    const context = code.substring(Math.max(0, cursorPosition - 20), cursorPosition);
    
    if (context.includes('console.')) {
      return ['log', 'error', 'warn', 'info'];
    }
    if (context.includes('document.')) {
      return ['getElementById', 'querySelector', 'createElement'];
    }
    if (context.includes('Array.')) {
      return ['from', 'isArray'];
    }
    if (context.includes('.')) {
      return ['map', 'filter', 'reduce', 'forEach', 'find'];
    }
    
    return ['const', 'let', 'function', 'if', 'for', 'while'];
  }
}

export const codestralAI = new CodestralAIService();