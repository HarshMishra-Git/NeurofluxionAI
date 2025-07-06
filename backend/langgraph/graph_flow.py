from langchain.schema import BaseMessage, HumanMessage, AIMessage
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime

class AgentGraphFlow:
    """LangGraph-based agent orchestration"""
    
    def __init__(self, agents: Dict[str, Any]):
        self.agents = agents
        self.graph_state = {}
        
    async def process_message(self, message: str, message_type: str = "text", conversation_id: Optional[int] = None) -> Dict[str, Any]:
        """Process message through the agent graph"""
        try:
            # Initialize graph state
            self.graph_state = {
                "original_message": message,
                "message_type": message_type,
                "conversation_id": conversation_id,
                "timestamp": datetime.now().isoformat(),
                "steps": []
            }
            
            # Step 1: Query Analysis
            analysis_result = await self._query_analysis_step(message)
            self.graph_state["steps"].append(analysis_result)
            
            # Step 2: Route to appropriate agent
            routing_result = await self._routing_step(analysis_result)
            self.graph_state["steps"].append(routing_result)
            
            # Step 3: Primary processing
            processing_result = await self._primary_processing_step(routing_result)
            self.graph_state["steps"].append(processing_result)
            
            # Step 4: Post-processing (summarization)
            summary_result = await self._post_processing_step(processing_result)
            self.graph_state["steps"].append(summary_result)
            
            # Step 5: Output processing (TTS if enabled)
            output_result = await self._output_processing_step(summary_result)
            self.graph_state["steps"].append(output_result)
            
            return {
                "response": output_result.get("final_response", ""),
                "agent_used": routing_result.get("selected_agent", "unknown"),
                "metadata": {
                    "processing_steps": len(self.graph_state["steps"]),
                    "total_processing_time": self._calculate_total_time(),
                    "graph_state": self.graph_state
                }
            }
            
        except Exception as e:
            raise Exception(f"Graph processing error: {str(e)}")
    
    async def _query_analysis_step(self, message: str) -> Dict[str, Any]:
        """Step 1: Analyze the query"""
        try:
            query_handler = self.agents["query_handler"]
            result = await query_handler.process_query(message)
            
            return {
                "step": "query_analysis",
                "agent": "query_handler",
                "result": result,
                "timestamp": datetime.now().isoformat(),
                "status": "completed"
            }
            
        except Exception as e:
            return {
                "step": "query_analysis",
                "agent": "query_handler",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "status": "failed"
            }
    
    async def _routing_step(self, analysis_result: Dict[str, Any]) -> Dict[str, Any]:
        """Step 2: Route to appropriate agent"""
        try:
            intent = analysis_result.get("result", {}).get("intent", "question")
            routing_decision = analysis_result.get("result", {}).get("routing_decision", {})
            
            selected_agent = routing_decision.get("primary_agent", "semantic_search")
            
            return {
                "step": "routing",
                "selected_agent": selected_agent,
                "intent": intent,
                "routing_decision": routing_decision,
                "timestamp": datetime.now().isoformat(),
                "status": "completed"
            }
            
        except Exception as e:
            return {
                "step": "routing",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "status": "failed"
            }
    
    async def _primary_processing_step(self, routing_result: Dict[str, Any]) -> Dict[str, Any]:
        """Step 3: Primary processing with selected agent"""
        try:
            selected_agent = routing_result.get("selected_agent", "semantic_search")
            message = self.graph_state["original_message"]
            
            if selected_agent == "semantic_search":
                agent = self.agents["semantic_search"]
                result = await agent.search(message)
                
                # If no good results, fallback to RAG
                if not result.get("results") or len(result["results"]) == 0:
                    fallback_agent = self.agents["fallback_rag"]
                    result = await fallback_agent.generate_response(message)
                    selected_agent = "fallback_rag"
                    
            elif selected_agent == "fallback_rag":
                agent = self.agents["fallback_rag"]
                result = await agent.generate_response(message)
                
            elif selected_agent == "vision":
                agent = self.agents["vision"]
                # Vision processing would require image data
                result = {"response": "Vision processing requires image data"}
                
            else:
                # Default to semantic search
                agent = self.agents["semantic_search"]
                result = await agent.search(message)
                selected_agent = "semantic_search"
            
            return {
                "step": "primary_processing",
                "agent": selected_agent,
                "result": result,
                "timestamp": datetime.now().isoformat(),
                "status": "completed"
            }
            
        except Exception as e:
            # Fallback to basic response
            return {
                "step": "primary_processing",
                "agent": "fallback",
                "result": {
                    "response": "I apologize, but I encountered an error processing your request. Please try again."
                },
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "status": "failed_with_fallback"
            }
    
    async def _post_processing_step(self, processing_result: Dict[str, Any]) -> Dict[str, Any]:
        """Step 4: Post-processing (summarization)"""
        try:
            summarizer = self.agents["summarizer"]
            
            # Extract content to summarize
            result = processing_result.get("result", {})
            
            if "response" in result:
                content = result["response"]
            elif "results" in result and result["results"]:
                # Combine search results
                content = "\n".join([r.get("content", "") for r in result["results"][:3]])
            else:
                content = "No content to summarize"
            
            if len(content) > 200:  # Only summarize if content is long enough
                summary_result = await summarizer.summarize(content)
                summarized_content = summary_result["summary"]
            else:
                summarized_content = content
            
            return {
                "step": "post_processing",
                "agent": "summarizer",
                "result": {
                    "summarized_content": summarized_content,
                    "original_length": len(content),
                    "summary_length": len(summarized_content)
                },
                "timestamp": datetime.now().isoformat(),
                "status": "completed"
            }
            
        except Exception as e:
            # Return original content if summarization fails
            result = processing_result.get("result", {})
            content = result.get("response", "Unable to process request")
            
            return {
                "step": "post_processing",
                "agent": "summarizer",
                "result": {
                    "summarized_content": content,
                    "original_length": len(content),
                    "summary_length": len(content)
                },
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "status": "failed_with_fallback"
            }
    
    async def _output_processing_step(self, summary_result: Dict[str, Any]) -> Dict[str, Any]:
        """Step 5: Output processing (TTS)"""
        try:
            final_response = summary_result.get("result", {}).get("summarized_content", "")
            
            # Generate TTS for the response
            tts_agent = self.agents["tts"]
            tts_result = await tts_agent.synthesize(final_response)
            
            return {
                "step": "output_processing",
                "agent": "tts",
                "final_response": final_response,
                "tts_result": tts_result,
                "timestamp": datetime.now().isoformat(),
                "status": "completed"
            }
            
        except Exception as e:
            final_response = summary_result.get("result", {}).get("summarized_content", "")
            
            return {
                "step": "output_processing",
                "agent": "tts",
                "final_response": final_response,
                "tts_result": None,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "status": "failed_with_fallback"
            }
    
    def _calculate_total_time(self) -> float:
        """Calculate total processing time"""
        if not self.graph_state.get("steps"):
            return 0.0
        
        start_time = datetime.fromisoformat(self.graph_state["timestamp"])
        end_time = datetime.fromisoformat(self.graph_state["steps"][-1]["timestamp"])
        
        return (end_time - start_time).total_seconds()
    
    async def get_graph_status(self) -> Dict[str, Any]:
        """Get current graph processing status"""
        return {
            "graph_state": self.graph_state,
            "active_agents": list(self.agents.keys()),
            "processing_steps": [
                "query_analysis",
                "routing",
                "primary_processing",
                "post_processing",
                "output_processing"
            ]
        }

def create_agent_graph(agents: Dict[str, Any]) -> AgentGraphFlow:
    """Create and return agent graph instance"""
    return AgentGraphFlow(agents)
