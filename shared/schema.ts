import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  messageType: text("message_type").notNull(), // 'text' | 'voice' | 'image'
  metadata: json("metadata"), // For storing additional data like audio paths, image data, etc.
  agentUsed: text("agent_used"), // Which agent processed this message
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentStatus = pgTable("agent_status", {
  id: serial("id").primaryKey(),
  agentName: text("agent_name").notNull().unique(),
  status: text("status").notNull(), // 'active' | 'processing' | 'standby' | 'ready' | 'error'
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  metadata: json("metadata"), // For storing agent-specific data
});

export const vectorDocuments = pgTable("vector_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  filePath: text("file_path"),
  documentType: text("document_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  content: true,
  role: true,
  messageType: true,
  metadata: true,
  agentUsed: true,
});

export const insertAgentStatusSchema = createInsertSchema(agentStatus).pick({
  agentName: true,
  status: true,
  metadata: true,
});

export const insertVectorDocumentSchema = createInsertSchema(vectorDocuments).pick({
  title: true,
  content: true,
  filePath: true,
  documentType: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertAgentStatus = z.infer<typeof insertAgentStatusSchema>;
export type AgentStatus = typeof agentStatus.$inferSelect;
export type InsertVectorDocument = z.infer<typeof insertVectorDocumentSchema>;
export type VectorDocument = typeof vectorDocuments.$inferSelect;
