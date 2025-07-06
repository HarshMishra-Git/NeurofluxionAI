# Neurofluxion AI - Orchestrating Intelligence

## Overview

Neurofluxion AI is a comprehensive multi-agent AI assistant system that combines a Python FastAPI backend with a React frontend. The system features a local-first architecture with voice, vision, and text capabilities, using specialized LangChain agents orchestrated through LangGraph.

## System Architecture

### Backend Architecture
- **Framework**: FastAPI (Python) for the main API server
- **Agent Orchestration**: LangGraph for managing multi-agent workflows
- **Agent Framework**: LangChain for individual agent implementation
- **Local LLM Integration**: Ollama for running models locally (Mistral, LLaMA3, Phi, LLaVA)
- **Vector Database**: ChromaDB for semantic search and document storage
- **Audio Processing**: Whisper for speech-to-text, Coqui TTS/Piper for text-to-speech
- **Image Processing**: PIL and OpenCV for vision capabilities

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Components**: Radix UI with Tailwind CSS styling
- **State Management**: React Query for server state management
- **Routing**: Wouter for lightweight routing
- **Build Tool**: Vite for development and bundling

### Middleware Layer
- **Node.js/Express**: Acts as a proxy between React frontend and Python backend
- **Database ORM**: Drizzle ORM with PostgreSQL schema definitions
- **Session Management**: Express session handling with PostgreSQL store

## Key Components

### Multi-Agent System
The system implements six specialized agents:

1. **QueryHandlerAgent**: Main orchestrator for routing requests
2. **SemanticSearchAgent**: Handles vector search using ChromaDB
3. **FallbackRAGAgent**: Provides fallback responses using local LLMs
4. **SummarizerAgent**: Summarizes content and responses
5. **TTSAgent**: Converts text to speech using local TTS engines
6. **VisionAgent**: Processes images for analysis and OCR

### Core Services
- **OllamaClient**: Interface for local LLM communication
- **ChromaClient**: Vector database operations
- **WhisperInterface**: Speech-to-text processing
- **EmbeddingService**: Text embedding generation

### Frontend Components
- **ChatInterface**: Main chat interaction component
- **VoiceInput**: Speech-to-text input handling
- **FileUpload**: Image and document upload functionality
- **AgentStatusPanel**: Real-time agent monitoring
- **ThemeProvider**: Light/dark mode management

## Data Flow

1. **Input Processing**: User input (text, voice, or image) is received by the frontend
2. **Request Routing**: Node.js server proxies requests to the Python backend
3. **Agent Orchestration**: LangGraph routes requests through appropriate agents
4. **Data Retrieval**: Semantic search queries ChromaDB for relevant context
5. **Response Generation**: Local LLMs generate responses using retrieved context
6. **Output Processing**: Responses are processed through summarizer and TTS agents
7. **Frontend Update**: Results are displayed in the React interface

## External Dependencies

### Local Services
- **Ollama**: Local LLM server running on port 11434
- **ChromaDB**: Vector database for semantic search
- **Whisper**: Local speech-to-text processing
- **TTS Engines**: Coqui TTS, Piper, or espeak for audio synthesis

### Database
- **PostgreSQL**: Primary database with Drizzle ORM
- **Connection**: Neon Database serverless PostgreSQL

### Development Tools
- **Vite**: Frontend build tool with React plugin
- **TypeScript**: Type safety across the application
- **Tailwind CSS**: Utility-first CSS framework

## Deployment Strategy

### Local Development
- Frontend runs on Vite dev server
- Backend runs on FastAPI with uvicorn
- Node.js express server acts as middleware proxy
- All AI models run locally through Ollama

### Production Build
- Frontend builds to static files in `dist/public`
- Backend bundles to `dist/index.js` using esbuild
- Single production server serves both frontend and API

### Database Management
- Drizzle migrations in `migrations/` directory
- Schema definitions in `shared/schema.ts`
- Database push command: `npm run db:push`

## Changelog

- July 05, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.