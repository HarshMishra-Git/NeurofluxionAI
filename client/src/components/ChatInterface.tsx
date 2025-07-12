import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, Download, Trash2, Play, User, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceInput } from './VoiceInput';
import { FileUpload } from './FileUpload';
import { Logo } from './Logo';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  messageType: 'text' | 'voice' | 'image';
  agentUsed?: string;
  metadata?: any;
  createdAt: string;
}

interface ChatResponse {
  response: string;
  agent_used: string;
  metadata?: any;
  processing_time?: number;
}

interface ChatInterfaceProps {
  conversationId: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false); // Track if a message is being sent
  const conversationIdRef = useRef(conversationId);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Only poll when not sending a message
  const { data: messages = [] as Message[], isLoading, refetch } = useQuery({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    refetchInterval: isSending ? false : 2000,
    enabled: !isSending,
  });

  // Local message state for instant UI update
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // Only clear localMessages ONCE when conversationId changes (new chat)
  useEffect(() => {
    setLocalMessages([]);
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const chatMutation = useMutation({
    mutationFn: async (data: { message: string; messageType?: string }) => {
      const response = await apiRequest(
        'POST',
        '/api/chat',
        {
          message: data.message,
          conversation_id: conversationId,
          message_type: data.messageType || 'text',
        }
      );
      const result = await response.json();
      return result;
    },
    onMutate: () => {
      setIsSending(true);
    },
    onSuccess: (data) => {
      console.log('Mutation onSuccess data:', data);
      // Extract the assistant's response from the correct field
      let assistantContent = '';
      if (data.aiMessage && data.aiMessage.content) {
        assistantContent = data.aiMessage.content;
      } else if (data.response) {
        assistantContent = data.response;
      } else {
        assistantContent = "No response from backend!";
      }
      setLocalMessages(prev => {
        // Remove any thinking indicator
        const filtered = prev.filter(m => m.role !== 'assistant' || m.content !== '');
        // Always append the assistant's response or a fallback
        return [
          ...filtered,
          {
            id: Date.now() + 1,
            content: assistantContent,
            role: 'assistant',
            messageType: 'text',
            agentUsed: data.agent_used,
            metadata: data.metadata,
            createdAt: new Date().toISOString(),
          }
        ];
      });
      setIsSending(false);
    },
    onError: (error) => {
      setIsSending(false);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      console.error('Chat error:', error);
    },
  });

  const handleSendMessage = async () => {
    if (inputMessage.trim() && !chatMutation.isPending && !isSending) {
      setIsSending(true);
      const userMsg: Message = {
        id: Date.now(),
        content: inputMessage.trim(),
        role: 'user',
        messageType: 'text',
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
        userMsg
      ]);
      setInputMessage('');

      // Show only one "AI is thinking" indicator
      const thinkingMsg: Message = {
        id: Date.now() + 2,
        content: '',
        role: 'assistant',
        messageType: 'text',
        agentUsed: undefined,
        metadata: undefined,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
        thinkingMsg
      ]);

      chatMutation.mutate({ message: userMsg.content });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceMessage = (transcript: string) => {
    if (transcript.trim()) {
      const userMsg: Message = {
        id: Date.now(),
        content: transcript,
        role: 'user',
        messageType: 'voice',
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
        userMsg
      ]);
      // Show only one 'Neurofluxion is thinking' indicator
      const thinkingMsg: Message = {
        id: Date.now() + 2,
        content: '',
        role: 'assistant',
        messageType: 'text',
        agentUsed: undefined,
        metadata: undefined,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && m.content === '')),
        thinkingMsg
      ]);
      chatMutation.mutate({ message: transcript, messageType: 'voice' });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  // TTS playback handler
  const handleListen = async (text: string) => {
    try {
      const res = await fetch('/api/voice/synthesize', {
        method: 'POST',
        body: new URLSearchParams({ text }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      if (!res.ok) throw new Error('TTS request failed');
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      toast({ title: 'TTS Error', description: 'Could not play audio.', variant: 'destructive' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 md:px-6 lg:px-8 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {isLoading && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="text-sm text-muted-foreground">Loading messages...</span>
                </div>
              )}

              {/* Welcome Message */}
              {localMessages.length === 0 && !isLoading && (
                <div className="text-center py-12 space-y-6">
                  <div className="flex justify-center">
                    <Logo size="lg" showText={true} showTagline={true} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Welcome to Your AI Assistant</h3>
                    <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
                      I'm your multi-agent AI assistant with specialized capabilities in text processing, image analysis, voice synthesis, and intelligent reasoning. Start a conversation to explore what we can accomplish together.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                      <Badge variant="secondary" className="px-3 py-1">Text Analysis</Badge>
                      <Badge variant="secondary" className="px-3 py-1">Voice Synthesis</Badge>
                      <Badge variant="secondary" className="px-3 py-1">Image Processing</Badge>
                      <Badge variant="secondary" className="px-3 py-1">Semantic Search</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {localMessages.filter(m => m && m.role).map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'justify-end' : ''
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 gradient-bg rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="text-white text-sm" />
                    </div>
                  )}
                  
                  <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${
                    message.role === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-4' 
                        : 'bg-muted mr-4'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.role === 'assistant' && !message.content ? (
                          <span className="flex items-center space-x-2">
                            <span>Neurofluxion is thinking</span>
                            <span className="inline-flex">
                              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block animate-bounce" style={{ animationDelay: '0s' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block animate-bounce" style={{ animationDelay: '0.1s', marginLeft: '2px' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block animate-bounce" style={{ animationDelay: '0.2s', marginLeft: '2px' }}></span>
                            </span>
                          </span>
                        ) : (
                          <>{message.content}</>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-2 px-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.createdAt)}
                      </span>
                      
                      {message.messageType === 'voice' && (
                        <Badge variant="secondary" className="text-xs">
                          Voice
                        </Badge>
                      )}
                      
                      {message.agentUsed && (
                        <Badge variant="outline" className="text-xs">
                          {message.agentUsed}
                        </Badge>
                      )}
                      
                      {message.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleListen(message.content)}
                          className="h-6 w-6 p-0"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="text-primary-foreground text-sm" />
                    </div>
                  )}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t bg-background/95 dark:bg-card/95 backdrop-blur-sm shadow-lg">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            {/* Voice Input Button */}
            <div className="flex-shrink-0">
              <VoiceInput onVoiceMessage={handleVoiceMessage} />
            </div>
            
            {/* Message Input */}
            <div className="flex-1 relative flex items-center bg-background dark:bg-muted rounded-2xl border border-border dark:border-border/50 focus-within:border-primary shadow-sm transition-colors chat-input-container">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message or use voice input..."
                className="flex-1 px-4 bg-transparent border-0 rounded-2xl focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground chat-input-field"
                disabled={chatMutation.isPending}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mr-2 h-8 w-8 p-0 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Send Button */}
            <div className="flex-shrink-0">
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || chatMutation.isPending}
                variant="outline"
                size="sm"
                className={`h-12 w-12 rounded-2xl p-0 shadow-md transition-all ${
                  !inputMessage.trim() || chatMutation.isPending
                    ? "bg-muted hover:bg-muted text-muted-foreground border-muted cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground border-primary"
                }`}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-muted-foreground">Text Mode</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-xs text-muted-foreground">Voice Available</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground hidden sm:block">
              Press Enter to send • Click mic for voice
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Component */}
      <FileUpload className="mx-4 md:mx-6 lg:mx-8 mb-4" />
    </div>
  );
}