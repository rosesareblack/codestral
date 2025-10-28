import React, { useState, useRef, useEffect } from 'react';
import { AIMessage, CodeBlock } from '@/types';
import { codestralAI } from '@/services/CodestralAIService';
import { Send, Bot, User, Loader2, Zap, Bug, HelpCircle, Code2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface AIChatProps {
  workspace: any;
  activeFile: any;
  isVisible?: boolean;
}

const AIChat: React.FC<AIChatProps> = ({ workspace, activeFile, isVisible = true }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFile, setCurrentFile] = useState<{ path?: string; content?: string; language?: string }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (activeFile) {
      setCurrentFile({
        path: activeFile.path,
        content: activeFile.content,
        language: activeFile.language
      });
    }
  }, [activeFile]);

  const handleSend = async (message?: string) => {
    const messageText = message || inputValue.trim();
    if (!messageText || isLoading) return;

    setInputValue('');
    setIsLoading(true);

    try {
      const response = await codestralAI.chat(messageText, {
        code: currentFile.content,
        filePath: currentFile.path,
      });

      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: 'generate' | 'debug' | 'explain') => {
    let prompt = '';
    
    switch (action) {
      case 'generate':
        prompt = `Generate code for ${currentFile.path || 'a new file'}. Language: ${currentFile.language || 'javascript'}`;
        break;
      case 'debug':
        prompt = `Debug this code and suggest fixes:\n\n\`\`\`\n${currentFile.content || 'No code available'}\n\`\`\``;
        break;
      case 'explain':
        prompt = `Explain this code in detail:\n\n\`\`\`\n${currentFile.content || 'No code available'}\n\`\`\``;
        break;
    }

    await handleSend(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const renderCodeBlock = (codeBlock: CodeBlock, index: number) => (
    <div key={index} className="my-3 rounded-lg border border-border overflow-hidden">
      {codeBlock.filename && (
        <div className="bg-muted px-4 py-2 text-sm font-medium border-b border-border">
          {codeBlock.filename}
        </div>
      )}
      <div className="relative">
        <Editor
          height="200px"
          defaultLanguage={codeBlock.language}
          value={codeBlock.code}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'none',
            theme: 'vs-dark',
            contextmenu: false,
          }}
        />
      </div>
    </div>
  );

  const renderMessage = (message: AIMessage) => (
    <div
      key={message.id}
      className={`flex gap-3 p-4 ${
        message.role === 'user' ? 'bg-muted/30' : 'bg-background'
      }`}
    >
      <div className="flex-shrink-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
          }`}
        >
          {message.role === 'user' ? (
            <User size={16} />
          ) : (
            <Bot size={16} />
          )}
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {message.role === 'user' ? 'You' : 'Codestral AI'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.codeBlocks && message.codeBlocks.length > 0 && (
          <div>
            {message.codeBlocks.map((codeBlock, index) => renderCodeBlock(codeBlock, index))}
          </div>
        )}
      </div>
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="text-white" size={20} />
            </div>
            <div>
              <h2 className="font-semibold">Codestral AI Assistant</h2>
              <p className="text-xs text-muted-foreground">
                Your intelligent coding companion
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-b border-border bg-muted/20">
        <div className="p-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => handleQuickAction('generate')}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Code2 size={16} />
            <span className="text-sm font-medium">Generate Code</span>
          </button>
          <button
            onClick={() => handleQuickAction('debug')}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Bug size={16} />
            <span className="text-sm font-medium">Debug Code</span>
          </button>
          <button
            onClick={() => handleQuickAction('explain')}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <HelpCircle size={16} />
            <span className="text-sm font-medium">Explain Code</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3 p-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Bot size={32} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Welcome to Codestral AI!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  I'm here to help you write, debug, and understand code.
                </p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>✨ Ask me to generate code in any language</p>
                <p>🐛 Debug issues in your current file</p>
                <p>📚 Explain complex code snippets</p>
                <p>⚡ Get instant coding assistance</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map(renderMessage)}
            {isLoading && (
              <div className="flex gap-3 p-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-muted/30">
        <div className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Codestral AI anything about coding..."
                className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 max-h-32"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {currentFile.path && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Context: {currentFile.path}
                </span>
              )}
            </div>
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
