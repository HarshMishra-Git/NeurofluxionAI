import { useState } from 'react';
import { Sun, Moon, Brain, HelpCircle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/ThemeProvider';
import { ChatInterface } from '@/components/ChatInterface';
import { AgentStatusPanel } from '@/components/AgentStatusPanel';

export default function Chat() {
  const { theme, toggleTheme } = useTheme();
  const [selectedDomain, setSelectedDomain] = useState('general');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                  <Brain className="text-white text-sm" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Neurofluxion AI</h1>
                  <p className="text-xs text-muted-foreground">Orchestrating Intelligence</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="rounded-lg"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="ecommerce" disabled>E-commerce (Coming Soon)</SelectItem>
                  <SelectItem value="healthcare" disabled>Healthcare (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Agent Status Panel */}
          <div className="lg:col-span-1">
            <AgentStatusPanel />
          </div>
          
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <ChatInterface />
          </div>
        </div>
      </div>

      {/* Floating Controls */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        <Button
          size="sm"
          className="w-12 h-12 rounded-full shadow-lg hidden"
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
