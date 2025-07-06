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

export function ChatInterface() {
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId] = useState(1); // Default conversation for now
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    refetchInterval: 2000,
  });

  // Local message state for instant UI update
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // Sync localMessages with backend-fetched messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      setLocalMessages(messages);
    }
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async ({ message, messageType }: { message: string; messageType?: string }) => {
      const response = await apiRequest('POST', '/api/chat', {
        message,
        conversationId,
        messageType: messageType || 'text'
      });
      return response.json() as Promise<ChatResponse>;
    },
    onSuccess: (data) => {
      // Only add the AI message, since the user message is already in localMessages
      const aiMsg: Message = {
        id: Date.now() + 1,
        content: data.response,
        role: 'assistant',
        messageType: 'text',
        agentUsed: data.agent_used,
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, aiMsg]);
      setInputMessage('');
      scrollToBottom();
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/status'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      // Add user message to local state immediately for instant feedback
      const userMsg: Message = {
        id: Date.now(),
        content: inputMessage.trim(),
        role: 'user',
        messageType: 'text',
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, userMsg]);
      chatMutation.mutate({ message: inputMessage.trim() });
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
      setLocalMessages(prev => [...prev, userMsg]);
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
    <div className="flex flex-col h-full">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-row items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">AI Assistant Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {isLoading && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="text-sm text-muted-foreground">Loading messages...</span>
                </div>
              )}

              {localMessages.filter(m => m && m.role).map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'justify-end' : ''
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 gradient-bg rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`flex-1 ${message.role === 'user' ? 'max-w-sm' : ''}`}>
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <div className={`flex items-center space-x-2 mt-2 ${
                      message.role === 'user' ? 'justify-end' : ''
                    }`}>
                      {message.role === 'assistant' && (
                        <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => handleListen(message.content)}>
                          <Play className="w-3 h-3 mr-1" />
                          Listen
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.createdAt)}
                      </span>
                      {message.agentUsed && (
                        <Badge variant="secondary" className="text-xs">
                          {message.agentUsed}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 gradient-bg rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                        <span className="text-xs text-muted-foreground">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex items-center space-x-3">
              <VoiceInput onVoiceMessage={handleVoiceMessage} />
              
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message or use voice input..."
                  className="pr-10"
                  disabled={chatMutation.isPending}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || chatMutation.isPending}
                size="sm"
                className="gradient-bg"
              >
                <Send className="w-4 h-4" />
              </Button>
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
              <div className="text-xs text-muted-foreground">
                Press Enter to send • Click mic for voice
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FileUpload className="mt-6" />
    </div>
  );
}
