import { AIMessage, CodeBlock } from '@/types';

class CodestralAIService {
  private conversationHistory: AIMessage[] = [];
  private messageIdCounter = 0;

  async generateCode(prompt: string, language: string = 'javascript'): Promise<string> {
    // Simulate AI code generation with intelligent responses
    await this.simulateDelay(1000);

    const codeTemplates: Record<string, (prompt: string) => string> = {
      javascript: (p) => this.generateJavaScriptCode(p),
      typescript: (p) => this.generateTypeScriptCode(p),
      python: (p) => this.generatePythonCode(p),
      java: (p) => this.generateJavaCode(p),
      go: (p) => this.generateGoCode(p),
    };

    const generator = codeTemplates[language] || codeTemplates.javascript;
    return generator(prompt);
  }

  async chat(userMessage: string, context?: { code?: string; filePath?: string }): Promise<AIMessage> {
    const userMsg: AIMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    this.conversationHistory.push(userMsg);

    await this.simulateDelay(800);

    const response = await this.generateResponse(userMessage, context);
    const assistantMsg: AIMessage = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      codeBlocks: response.codeBlocks,
    };
    this.conversationHistory.push(assistantMsg);

    return assistantMsg;
  }

  async debugCode(code: string, error: string): Promise<string> {
    await this.simulateDelay(1200);

    return `I've analyzed the error and your code. Here's what's causing the issue:

**Problem**: ${error}

**Root Cause**: The error typically occurs due to one of these reasons:
1. Undefined variable or null reference
2. Type mismatch or incorrect function signature
3. Missing import or dependency

**Suggested Fix**:
\`\`\`
${this.generateDebugFix(code, error)}
\`\`\`

**Explanation**: 
- Added proper error handling
- Fixed variable initialization
- Ensured type safety

Would you like me to explain any specific part of the fix?`;
  }

  async explainCode(code: string): Promise<string> {
    await this.simulateDelay(1000);

    return `Let me break down this code for you:

**Purpose**: This code implements ${this.inferCodePurpose(code)}

**Key Components**:
1. **Data Structures**: Uses ${this.identifyDataStructures(code)}
2. **Logic Flow**: ${this.describeLogicFlow(code)}
3. **Time Complexity**: O(n) where n is the input size

**Best Practices**:
- Clean, readable code structure
- Proper error handling
- Type safety (if applicable)

**Potential Improvements**:
- Consider adding input validation
- Could be optimized for edge cases
- Add comprehensive error messages`;
  }

  async suggestCompletion(code: string, cursorPosition: number): Promise<string[]> {
    await this.simulateDelay(200);

    // Intelligent code completion suggestions
    const context = code.substring(Math.max(0, cursorPosition - 50), cursorPosition);
    
    if (context.includes('function ') || context.includes('const ')) {
      return ['functionName', 'handleEvent', 'processData', 'getData', 'setData'];
    }
    if (context.includes('import ')) {
      return ['React', 'useState', 'useEffect', 'Component'];
    }
    if (context.includes('.')) {
      return ['map', 'filter', 'reduce', 'forEach', 'find', 'includes'];
    }

    return ['const', 'let', 'function', 'class', 'import', 'export'];
  }

  getConversationHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${this.messageIdCounter++}`;
  }

  private async generateResponse(message: string, context?: { code?: string; filePath?: string }): Promise<{ content: string; codeBlocks?: CodeBlock[] }> {
    const lowerMessage = message.toLowerCase();

    // Code generation requests
    if (lowerMessage.includes('create') || lowerMessage.includes('write') || lowerMessage.includes('generate')) {
      const language = this.detectLanguageFromMessage(message);
      const code = await this.generateCode(message, language);
      return {
        content: `I'll help you create that. Here's the code:`,
        codeBlocks: [{ language, code }],
      };
    }

    // Debugging requests
    if (lowerMessage.includes('debug') || lowerMessage.includes('error') || lowerMessage.includes('fix')) {
      return {
        content: `Let me help you debug that issue. ${context?.code ? 'Looking at your code, ' : ''}I can see a few potential problems and solutions.`,
      };
    }

    // Explanation requests
    if (lowerMessage.includes('explain') || lowerMessage.includes('how does') || lowerMessage.includes('what is')) {
      return {
        content: `Great question! Let me explain that for you in detail...`,
      };
    }

    // Optimization requests
    if (lowerMessage.includes('optimize') || lowerMessage.includes('improve') || lowerMessage.includes('better')) {
      return {
        content: `I can help you optimize that! Here are some suggestions for improvement...`,
      };
    }

    // Default helpful response
    return {
      content: `I'm Codestral, your AI coding assistant. I can help you with:
- Writing code in multiple languages
- Debugging and fixing errors
- Explaining complex concepts
- Code optimization and best practices
- Architecture and design suggestions

What would you like me to help you with?`,
    };
  }

  private generateJavaScriptCode(prompt: string): string {
    return `// Generated JavaScript code based on: ${prompt}
function processData(input) {
  if (!input) {
    throw new Error('Input is required');
  }

  const result = input
    .filter(item => item != null)
    .map(item => ({
      ...item,
      processed: true,
      timestamp: Date.now()
    }));

  return result;
}

// Usage example
const data = [{ id: 1, value: 'test' }];
const processed = processData(data);
console.log(processed);`;
  }

  private generateTypeScriptCode(prompt: string): string {
    return `// Generated TypeScript code based on: ${prompt}
interface DataItem {
  id: number;
  value: string;
  processed?: boolean;
  timestamp?: number;
}

function processData(input: DataItem[]): DataItem[] {
  if (!input || input.length === 0) {
    throw new Error('Input array is required');
  }

  return input
    .filter((item): item is DataItem => item != null)
    .map(item => ({
      ...item,
      processed: true,
      timestamp: Date.now()
    }));
}

// Usage example
const data: DataItem[] = [{ id: 1, value: 'test' }];
const processed = processData(data);
console.log(processed);`;
  }

  private generatePythonCode(prompt: string): string {
    return `# Generated Python code based on: ${prompt}
from typing import List, Dict, Any
from datetime import datetime

def process_data(input_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Process input data and add metadata.
    
    Args:
        input_data: List of dictionaries to process
        
    Returns:
        Processed list with added metadata
    """
    if not input_data:
        raise ValueError("Input data is required")
    
    result = []
    for item in input_data:
        if item is not None:
            processed_item = {
                **item,
                'processed': True,
                'timestamp': datetime.now().timestamp()
            }
            result.append(processed_item)
    
    return result

# Usage example
data = [{'id': 1, 'value': 'test'}]
processed = process_data(data)
print(processed)`;
  }

  private generateJavaCode(prompt: string): string {
    return `// Generated Java code based on: ${prompt}
import java.util.*;
import java.time.Instant;

public class DataProcessor {
    
    public static class DataItem {
        public int id;
        public String value;
        public boolean processed;
        public long timestamp;
        
        public DataItem(int id, String value) {
            this.id = id;
            this.value = value;
        }
    }
    
    public static List<DataItem> processData(List<DataItem> input) {
        if (input == null || input.isEmpty()) {
            throw new IllegalArgumentException("Input is required");
        }
        
        List<DataItem> result = new ArrayList<>();
        for (DataItem item : input) {
            if (item != null) {
                item.processed = true;
                item.timestamp = Instant.now().toEpochMilli();
                result.add(item);
            }
        }
        
        return result;
    }
    
    public static void main(String[] args) {
        List<DataItem> data = Arrays.asList(new DataItem(1, "test"));
        List<DataItem> processed = processData(data);
        System.out.println(processed);
    }
}`;
  }

  private generateGoCode(prompt: string): string {
    return `// Generated Go code based on: ${prompt}
package main

import (
    "fmt"
    "time"
)

type DataItem struct {
    ID        int    \`json:"id"\`
    Value     string \`json:"value"\`
    Processed bool   \`json:"processed"\`
    Timestamp int64  \`json:"timestamp"\`
}

func processData(input []DataItem) ([]DataItem, error) {
    if len(input) == 0 {
        return nil, fmt.Errorf("input is required")
    }

    result := make([]DataItem, 0, len(input))
    for _, item := range input {
        item.Processed = true
        item.Timestamp = time.Now().Unix()
        result = append(result, item)
    }

    return result, nil
}

func main() {
    data := []DataItem{{ID: 1, Value: "test"}}
    processed, err := processData(data)
    if err != nil {
        panic(err)
    }
    fmt.Printf("%+v\\n", processed)
}`;
  }

  private generateDebugFix(code: string, error: string): string {
    return code.split('\n').map((line, index) => {
      if (index === 0) {
        return `try {
  ${line}`;
      }
      if (index === 3) {
        return `  ${line}
} catch (error) {
  console.error('Error:', error);
  return null;
}`;
      }
      return `  ${line}`;
    }).join('\n');
  }

  private inferCodePurpose(code: string): string {
    if (code.includes('function') || code.includes('=>')) {
      return 'a function with specific business logic';
    }
    if (code.includes('class')) {
      return 'a class-based component or data structure';
    }
    return 'data processing and manipulation';
  }

  private identifyDataStructures(code: string): string {
    const structures: string[] = [];
    if (code.includes('[]') || code.includes('Array')) structures.push('arrays');
    if (code.includes('{}') || code.includes('Object')) structures.push('objects');
    if (code.includes('Map')) structures.push('maps');
    if (code.includes('Set')) structures.push('sets');
    return structures.join(', ') || 'primitive data types';
  }

  private describeLogicFlow(code: string): string {
    if (code.includes('if') && code.includes('else')) {
      return 'Conditional branching with multiple paths';
    }
    if (code.includes('for') || code.includes('while')) {
      return 'Iterative processing with loops';
    }
    if (code.includes('map') || code.includes('filter')) {
      return 'Functional array transformations';
    }
    return 'Sequential execution of statements';
  }

  private detectLanguageFromMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('typescript') || lowerMessage.includes('ts')) return 'typescript';
    if (lowerMessage.includes('python') || lowerMessage.includes('py')) return 'python';
    if (lowerMessage.includes('java')) return 'java';
    if (lowerMessage.includes('go') || lowerMessage.includes('golang')) return 'go';
    if (lowerMessage.includes('rust')) return 'rust';
    return 'javascript';
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const codestralAI = new CodestralAIService();
