from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import BaseTool
from langchain.prompts import PromptTemplate
from typing import Dict, Any, List
import asyncio
from datetime import datetime

class QueryHandlerAgent:
    """Main query handler agent that routes requests to appropriate sub-agents"""
    
    def __init__(self, ollama_client):
        self.ollama_client = ollama_client
        self.agent_name = "QueryHandler"
        self.status = "ready"
        
    async def process_query(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process incoming query and determine routing"""
        try:
            self.status = "processing"
            
            # Analyze query intent
            intent = await self._analyze_intent(query)
            
            # Determine routing strategy
            routing_decision = await self._determine_routing(query, intent)
            
            result = {
                "intent": intent,
                "routing_decision": routing_decision,
                "query": query,
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name
            }
            
            self.status = "ready"
            return result
            
        except Exception as e:
            self.status = "error"
            raise Exception(f"Query handler error: {str(e)}")
    
    async def _analyze_intent(self, query: str) -> str:
        """Analyze query intent using embeddings and patterns"""
        try:
            # Force summarize intent for queries containing 'summarize' or 'summary'
            if 'summarize' in query.lower() or 'summary' in query.lower():
                return "summarize"
            # Use Ollama to analyze intent
            prompt = f"""
            Analyze the following query and determine the primary intent:
            
            Query: {query}
            
            Possible intents:
            - search: Looking for specific information
            - generate: Creating new content
            - summarize: Summarizing existing content
            - question: Asking a direct question
            - conversation: General conversation
            - vision: Image-related query
            - audio: Audio-related query
            
            Return only the intent category:
            """
            
            response = await self.ollama_client.generate(
                model="mistral:latest",
                prompt=prompt,
                max_tokens=50
            )
            
            intent = response.strip().lower()
            
            # Validate intent
            valid_intents = ["search", "generate", "summarize", "question", "conversation", "vision", "audio"]
            if intent not in valid_intents:
                intent = "question"  # Default fallback
                
            return intent
            
        except Exception as e:
            return "question"  # Default fallback
    
    async def _determine_routing(self, query: str, intent: str) -> Dict[str, Any]:
        """Determine which agents should handle the query"""
        routing = {
            "primary_agent": "semantic_search",
            "fallback_agent": "fallback_rag",
            "post_processing": ["summarizer"],
            "priority": "normal"
        }
        
        # Route based on intent
        if intent == "search":
            routing["primary_agent"] = "semantic_search"
        elif intent == "generate":
            routing["primary_agent"] = "fallback_rag"
        elif intent == "summarize":
            routing["primary_agent"] = "summarizer"
        elif intent == "vision":
            routing["primary_agent"] = "vision"
        elif intent == "audio":
            routing["primary_agent"] = "fallback_rag"
            routing["pre_processing"] = ["whisper"]
        else:
            routing["primary_agent"] = "semantic_search"
        
        # Always add TTS for output
        routing["output_processing"] = ["tts"]
        
        return routing
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "last_activity": datetime.now().isoformat(),
            "capabilities": [
                "query_analysis",
                "intent_detection",
                "routing_decisions",
                "workflow_orchestration"
            ]
        }
