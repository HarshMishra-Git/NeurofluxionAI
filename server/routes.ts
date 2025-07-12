import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, insertAgentStatusSchema } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Backend API URL (configurable for different environments)
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Proxy routes to Python backend
  // app.use('/api/chat', async (req, res) => { ... });

  app.use('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const formData = new FormData();
      formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);

      const response = await fetch(`${BACKEND_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Upload proxy error:', error);
      res.status(500).json({ error: 'Failed to process file upload' });
    }
  });

  app.use('/api/agents/status', async (req, res) => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/agents/status`, {
        method: req.method,
        headers: req.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Agent status proxy error:', error);
      // Fallback to mock data for development
      res.json([
        { id: 1, agentName: 'QueryHandler', status: 'ready', lastActivity: new Date().toISOString(), metadata: null },
        { id: 2, agentName: 'SemanticSearch', status: 'ready', lastActivity: new Date().toISOString(), metadata: null },
        { id: 3, agentName: 'FallbackRAG', status: 'ready', lastActivity: new Date().toISOString(), metadata: null },
        { id: 4, agentName: 'Summarizer', status: 'ready', lastActivity: new Date().toISOString(), metadata: null },
        { id: 5, agentName: 'TTS', status: 'ready', lastActivity: new Date().toISOString(), metadata: null },
        { id: 6, agentName: 'Vision', status: 'ready', lastActivity: new Date().toISOString(), metadata: null },
      ]);
    }
  });

  app.use('/api/health', async (req, res) => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/health`);

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Health check proxy error:', error);
      // Fallback health status
      res.json({
        status: 'partial',
        timestamp: new Date().toISOString(),
        agents: [],
        metrics: {
          vectorDBSize: 'Unknown',
          ollamaStatus: 'disconnected',
          responseTime: 'Unknown'
        }
      });
    }
  });

  // Conversations - using local storage for frontend state
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Messages - using local storage for frontend state
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        conversationId
      });
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Enhanced chat endpoint that integrates with Python backend
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationId, messageType = 'text' } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message content is required" });
      }
      // Check for duplicate user message in the last 30 seconds
      const recentMessages = await storage.getMessages(conversationId || 1);
      const now = Date.now();
      const duplicate = recentMessages && recentMessages.find(m =>
        m.role === 'user' &&
        m.content === message &&
        now - new Date(m.createdAt).getTime() < 30000
      );
      if (duplicate) {
        // Return the most recent AI response for this user message
        const aiMessages = recentMessages.filter(m => m.role === 'assistant' && m.createdAt > duplicate.createdAt);
        if (aiMessages.length > 0) {
          return res.json({
            userMessage: duplicate,
            aiMessage: aiMessages[0],
            metadata: aiMessages[0].metadata
          });
        } else {
          return res.json({ userMessage: duplicate, aiMessage: null, metadata: null });
        }
      }
      // Save user message locally
      const userMessage = await storage.createMessage({
        conversationId: conversationId || 1,
        content: message,
        role: 'user',
        messageType,
        metadata: null,
        agentUsed: null
      });
      // Forward to Python backend
      const backendResponse = await fetch(`${BACKEND_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          message_type: messageType
        }),
      });
      if (!backendResponse.ok) {
        throw new Error(`Backend responded with ${backendResponse.status}`);
      }
      const backendData = await backendResponse.json();
      // Save AI response locally
      const aiMessage = await storage.createMessage({
        conversationId: conversationId || 1,
        content: backendData.response,
        role: 'assistant',
        messageType: 'text',
        metadata: backendData.metadata,
        agentUsed: backendData.agent_used
      });
      res.json({
        userMessage,
        aiMessage,
        metadata: backendData.metadata
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
