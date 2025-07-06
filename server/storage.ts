import { 
  conversations, 
  messages, 
  agentStatus, 
  vectorDocuments,
  type Conversation, 
  type Message, 
  type AgentStatus, 
  type VectorDocument,
  type InsertConversation, 
  type InsertMessage, 
  type InsertAgentStatus, 
  type InsertVectorDocument 
} from "@shared/schema";

export interface IStorage {
  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;

  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message>;
  deleteMessage(id: number): Promise<void>;

  // Agent Status
  getAgentStatuses(): Promise<AgentStatus[]>;
  getAgentStatus(agentName: string): Promise<AgentStatus | undefined>;
  createOrUpdateAgentStatus(agentStatus: InsertAgentStatus): Promise<AgentStatus>;
  updateAgentStatus(agentName: string, updates: Partial<InsertAgentStatus>): Promise<AgentStatus>;

  // Vector Documents
  getVectorDocuments(): Promise<VectorDocument[]>;
  getVectorDocument(id: number): Promise<VectorDocument | undefined>;
  createVectorDocument(document: InsertVectorDocument): Promise<VectorDocument>;
  deleteVectorDocument(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message> = new Map();
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private vectorDocuments: Map<number, VectorDocument> = new Map();
  private currentId = 1;

  // Initialize with default agent statuses
  constructor() {
    const defaultAgents = [
      'QueryHandler',
      'SemanticSearch',
      'FallbackRAG',
      'Summarizer',
      'TTS',
      'Vision'
    ];

    defaultAgents.forEach(agentName => {
      this.agentStatuses.set(agentName, {
        id: this.currentId++,
        agentName,
        status: 'ready',
        lastActivity: new Date(),
        metadata: null
      });
    });
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentId++;
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    const updated = { ...conversation, ...updates, updatedAt: new Date() };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    this.conversations.delete(id);
    // Also delete associated messages
    for (const [messageId, message] of Array.from(this.messages.entries())) {
      if (message.conversationId === id) {
        this.messages.delete(messageId);
      }
    }
  }

  // Messages
  async getMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentId++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      metadata: insertMessage.metadata || null,
      agentUsed: insertMessage.agentUsed || null,
    };
    this.messages.set(id, message);
    return message;
  }

  async updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message> {
    const message = this.messages.get(id);
    if (!message) {
      throw new Error('Message not found');
    }
    const updated = { ...message, ...updates };
    this.messages.set(id, updated);
    return updated;
  }

  async deleteMessage(id: number): Promise<void> {
    this.messages.delete(id);
  }

  // Agent Status
  async getAgentStatuses(): Promise<AgentStatus[]> {
    return Array.from(this.agentStatuses.values());
  }

  async getAgentStatus(agentName: string): Promise<AgentStatus | undefined> {
    return this.agentStatuses.get(agentName);
  }

  async createOrUpdateAgentStatus(insertAgentStatus: InsertAgentStatus): Promise<AgentStatus> {
    const existing = this.agentStatuses.get(insertAgentStatus.agentName);
    if (existing) {
      const updated = { ...existing, ...insertAgentStatus, lastActivity: new Date() };
      this.agentStatuses.set(insertAgentStatus.agentName, updated);
      return updated;
    } else {
      const id = this.currentId++;
      const agentStatus: AgentStatus = {
        ...insertAgentStatus,
        id,
        lastActivity: new Date(),
        metadata: insertAgentStatus.metadata || null,
      };
      this.agentStatuses.set(insertAgentStatus.agentName, agentStatus);
      return agentStatus;
    }
  }

  async updateAgentStatus(agentName: string, updates: Partial<InsertAgentStatus>): Promise<AgentStatus> {
    const agentStatus = this.agentStatuses.get(agentName);
    if (!agentStatus) {
      throw new Error('Agent status not found');
    }
    const updated = { ...agentStatus, ...updates, lastActivity: new Date() };
    this.agentStatuses.set(agentName, updated);
    return updated;
  }

  // Vector Documents
  async getVectorDocuments(): Promise<VectorDocument[]> {
    return Array.from(this.vectorDocuments.values());
  }

  async getVectorDocument(id: number): Promise<VectorDocument | undefined> {
    return this.vectorDocuments.get(id);
  }

  async createVectorDocument(insertVectorDocument: InsertVectorDocument): Promise<VectorDocument> {
    const id = this.currentId++;
    const document: VectorDocument = {
      ...insertVectorDocument,
      id,
      createdAt: new Date(),
      filePath: insertVectorDocument.filePath || null,
    };
    this.vectorDocuments.set(id, document);
    return document;
  }

  async deleteVectorDocument(id: number): Promise<void> {
    this.vectorDocuments.delete(id);
  }
}

export const storage = new MemStorage();
