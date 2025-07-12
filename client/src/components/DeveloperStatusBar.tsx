import { useState, useEffect } from 'react';
import { Activity, Wifi, Database, Clock, Code, GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

interface SystemStatus {
  status: string;
  timestamp: string;
  backend_connected?: boolean;
  response_time?: number;
}

export function DeveloperStatusBar() {
  const [buildInfo] = useState({
    version: '1.0.0',
    build: 'dev-' + Date.now().toString().slice(-6),
    environment: 'development',
    developer: 'Harsh Mishra',
    role: 'Full Stack AI Developer',
    framework: 'React + FastAPI',
    agents: 'LangChain/LangGraph'
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch system health
  const { data: healthData } = useQuery<SystemStatus>({
    queryKey: ['/api/health'],
    refetchInterval: 5000,
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'bg-green-600';
      case 'staging': return 'bg-yellow-600';
      case 'development': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="border-t backdrop-blur-sm px-4 py-3 flex items-center justify-between text-xs text-muted-foreground dev-status-bar">
      {/* Left side - Build & Developer Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="dev-avatar">
            <img 
              src="/developer-profile.jpg" 
              alt="Developer" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium">Developed by Harsh Mishra</span>
            <span className="text-xs text-muted-foreground">Neurofluxion v1.0.0</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <GitBranch className="w-3 h-3" />
          <span>v{buildInfo.version}</span>
          <Badge variant="outline" className="text-xs px-1 py-0 h-4">
            {buildInfo.build}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Activity className="w-3 h-3" />
          <span>{buildInfo.framework}</span>
        </div>

        <Badge 
          className={`text-xs px-2 py-0 h-4 text-white ${getEnvironmentColor(buildInfo.environment)}`}
        >
          {buildInfo.environment.toUpperCase()}
        </Badge>
      </div>

      {/* Right side - System Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(healthData?.status)}`} />
          <span>Backend: {healthData?.backend_connected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {healthData?.response_time && (
          <div className="flex items-center space-x-1">
            <Database className="w-3 h-3" />
            <span>{healthData.response_time}ms</span>
          </div>
        )}

        <div className="flex items-center space-x-1">
          <Wifi className="w-3 h-3" />
          <span>Multi-Agent System</span>
        </div>

        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{currentTime.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}