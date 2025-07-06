import { useQuery } from '@tanstack/react-query';
import { Brain, Activity, Database, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AgentStatus {
  id: number;
  agentName: string;
  status: 'active' | 'processing' | 'standby' | 'ready' | 'error';
  lastActivity: string;
  metadata: any;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  agents: Array<{
    name: string;
    status: string;
    lastActivity: string;
  }>;
  metrics: {
    vectorDBSize: string;
    ollamaStatus: string;
    responseTime: string;
  };
}

const statusColors = {
  active: 'bg-green-500',
  processing: 'bg-blue-500',
  standby: 'bg-yellow-500',
  ready: 'bg-purple-500',
  error: 'bg-red-500'
};

const statusAnimations = {
  active: 'animate-pulse-slow',
  processing: 'animate-spin-slow',
  standby: '',
  ready: 'animate-bounce-slow',
  error: 'animate-pulse'
};

export function AgentStatusPanel() {
  const { data: agentStatuses, isLoading } = useQuery<AgentStatus[]>({
    queryKey: ['/api/agents/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: systemHealth } = useQuery<SystemHealth>({
    queryKey: ['/api/health'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gray-300 rounded-full" />
                    <div className="w-20 h-4 bg-gray-300 rounded animate-pulse" />
                  </div>
                  <div className="w-12 h-3 bg-gray-300 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Agent Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agentStatuses?.map((agent, index) => (
              <div key={agent.id || `agent-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${statusColors[agent.status]} ${statusAnimations[agent.status]}`} />
                  <span className="text-sm font-medium">{agent.agentName || (agent as any).agent_name}</span>
                </div>
                <Badge variant={agent.status === 'active' || agent.status === 'ready' ? 'default' : 'secondary'}>
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Vector DB</span>
                <span>{systemHealth?.metrics?.vectorDBSize || '2.1GB'}</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Ollama Models</span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  {systemHealth?.metrics?.ollamaStatus || 'Connected'}
                </span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Response Time</span>
                <span>{systemHealth?.metrics?.responseTime || '1.2s'}</span>
              </div>
              <Progress value={30} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
