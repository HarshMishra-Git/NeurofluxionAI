from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio

class FallbackRAGAgent:
    """Fallback RAG agent using local LLM when semantic search fails"""
    
    def __init__(self, ollama_client):
        self.ollama_client = ollama_client
        self.agent_name = "FallbackRAG"
        self.status = "ready"
        
        # RAG prompt template
        self.rag_prompt = PromptTemplate(
            template="""
            You are a helpful AI assistant with access to a knowledge base. 
            Use the following context to answer the user's question. If you don't know the answer from the context, say so clearly.
            
            Context: {context}
            
            Question: {question}
            
            Answer:
            """,
            input_variables=["context", "question"]
        )
        
    async def generate_response(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate response using RAG approach"""
        try:
            self.status = "processing"
            
            # Get relevant context
            relevant_context = await self._get_relevant_context(query, context)
            
            # Generate response using local LLM (streaming enabled)
            response = await self._generate_with_llm(query, relevant_context, stream=True)
            
            # Post-process response
            processed_response = await self._post_process_response(response, query)
            
            self.status = "ready"
            
            return {
                "response": processed_response,
                "context_used": relevant_context,
                "model_used": "mistral:latest",
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name,
                "metadata": {
                    "context_length": len(relevant_context),
                    "response_length": len(processed_response),
                    "generation_method": "rag"
                }
            }
            
        except Exception as e:
            self.status = "error"
            print(f"RAG generation error: {str(e)}")
            # Provide a basic fallback response
            fallback_response = f"I understand you're asking about '{query}'. Let me provide you with some information based on my training data. {query} is an interesting topic that I can help you explore further. Would you like me to elaborate on any specific aspect?"
            
            return {
                "response": fallback_response,
                "context_used": "fallback_context",
                "model_used": "fallback",
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name,
                "error": str(e),
                "metadata": {
                    "context_length": 0,
                    "response_length": len(fallback_response),
                    "generation_method": "fallback"
                }
            }
    
    async def _get_relevant_context(self, query: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Get relevant context for RAG"""
        if context and "search_results" in context:
            # Use provided search results
            results = context["search_results"]
            context_parts = []
            
            for result in results[:3]:  # Use top 3 results
                content = result.get("content", "")
                if content:
                    context_parts.append(content)
            
            return "\n\n".join(context_parts)
        else:
            # Generate generic context based on query
            return await self._generate_context_from_query(query)
    
    async def _generate_context_from_query(self, query: str) -> str:
        """Generate context when no search results available"""
        # This would typically query a knowledge base
        # For now, return a placeholder
        return f"Based on the query '{query}', I'll provide information from my training data."
    
    async def _generate_with_llm(self, query: str, context: str, stream: bool = True) -> str:
        """Generate response using local LLM"""
        try:
            # Format prompt
            formatted_prompt = self.rag_prompt.format(
                context=context,
                question=query
            )
            
            # Generate response
            response = await self.ollama_client.generate(
                model="mistral:latest",
                prompt=formatted_prompt,
                max_tokens=1000,
                temperature=0.7,
                stream=stream
            )
            
            return response.strip()
            
        except Exception as e:
            raise Exception(f"LLM generation failed: {str(e)}")
    
    async def _post_process_response(self, response: str, query: str) -> str:
        """Post-process the generated response"""
        # Clean up response
        response = response.strip()
        
        # Remove any unwanted patterns
        if response.startswith("Answer:"):
            response = response[7:].strip()
        
        # Ensure response is not empty
        if not response:
            response = "I apologize, but I couldn't generate a meaningful response to your query. Please try rephrasing your question."
        
        return response
    
    async def generate_creative_content(self, prompt: str, content_type: str = "general") -> Dict[str, Any]:
        """Generate creative content without RAG"""
        try:
            self.status = "processing"
            
            # Adjust prompt based on content type
            creative_prompt = self._format_creative_prompt(prompt, content_type)
            
            # Generate with higher temperature for creativity
            response = await self.ollama_client.generate(
                model="mistral:latest",
                prompt=creative_prompt,
                max_tokens=1500,
                temperature=0.9
            )
            
            self.status = "ready"
            
            return {
                "content": response.strip(),
                "content_type": content_type,
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name,
                "metadata": {
                    "generation_method": "creative",
                    "temperature": 0.9
                }
            }
            
        except Exception as e:
            self.status = "error"
            raise Exception(f"Creative generation error: {str(e)}")
    
    def _format_creative_prompt(self, prompt: str, content_type: str) -> str:
        """Format prompt for creative generation"""
        if content_type == "story":
            return f"Write a creative story based on: {prompt}"
        elif content_type == "explanation":
            return f"Provide a detailed explanation of: {prompt}"
        elif content_type == "analysis":
            return f"Analyze the following topic: {prompt}"
        else:
            return prompt
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "last_activity": datetime.now().isoformat(),
            "capabilities": [
                "rag_generation",
                "creative_content",
                "context_processing",
                "llm_interaction"
            ],
            "model_info": {
                "primary_model": "mistral:latest",
                "fallback_models": ["llama3:latest", "phi:latest"]
            }
        }
