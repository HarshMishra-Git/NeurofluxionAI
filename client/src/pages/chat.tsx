import { useState, useEffect } from 'react';
import { Sun, Moon, Brain, Menu, X, Settings, HelpCircle, Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/ThemeProvider';
import React from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { AgentStatusPanel } from '@/components/AgentStatusPanel';
import { DeveloperStatusBar } from '@/components/DeveloperStatusBar';
import { Logo } from '@/components/Logo';
import { v4 as uuidv4 } from 'uuid';

export default function Chat() {
  const { theme, toggleTheme } = useTheme();
  const [selectedDomain, setSelectedDomain] = useState('general');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [conversationId, setConversationId] = useState(() => Date.now().toString());

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar - Agent Status Panel */}
      <div className={`${
        sidebarOpen ? 'w-80' : 'w-0'
      } transition-all duration-300 ease-in-out flex-shrink-0 bg-card border-r border-border ${
        isMobile ? 'absolute z-50 h-full' : 'relative'
      }`}>
        <div className={`${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 h-full overflow-hidden`}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Logo size="sm" showText={true} showTagline={true} />
            {isMobile && (
              <Button variant="ghost" size="sm" onClick={toggleSidebar}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* New Chat Button */}
            <Button 
              className="w-full gradient-bg rounded-xl"
              onClick={() => setConversationId(Date.now().toString())}
            >
              + New Chat
            </Button>
            
            {/* Recent Conversations */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2">Recent Conversations</h3>
              <div className="space-y-1">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-left h-auto p-3 rounded-lg"
                >
                  <div className="truncate">
                    <div className="font-medium text-sm">Welcome Chat</div>
                    <div className="text-xs text-muted-foreground">Current conversation</div>
                  </div>
                </Button>
              </div>
            </div>
            
            {/* Agent Status */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-3">Agent Status</h3>
              <AgentStatusPanel />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleSidebar}
              className="flex items-center space-x-2"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              {!sidebarOpen && <span className="hidden sm:inline">Agents</span>}
            </Button>
            
            {!sidebarOpen && (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 gradient-bg rounded-md flex items-center justify-center">
                  <Brain className="text-white text-xs" />
                </div>
                <span className="font-semibold hidden sm:inline">Neurofluxion AI</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-[140px] sm:w-[180px] h-9">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="ecommerce" disabled>E-commerce</SelectItem>
                <SelectItem value="healthcare" disabled>Healthcare</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            
            <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hidden sm:flex">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Chat Interface - Full Height */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface conversationId={conversationId} />
        </div>

        {/* Developer Status Bar */}
        <DeveloperStatusBar />
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Floating Status Indicator */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-30">
        <Button
          size="sm"
          className="w-12 h-12 rounded-full shadow-lg hidden sm:flex"
          variant="secondary"
        >
          <Volume2 className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          className="w-12 h-12 rounded-full shadow-lg"
          variant="secondary"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
        
        <div className="w-12 h-12 border-2 border-border rounded-full shadow-lg flex items-center justify-center bg-card">
          <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse-slow" />
        </div>
      </div>
    </div>
  );
}
