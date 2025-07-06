from langchain.chains.summarize import load_summarize_chain
from langchain.prompts import PromptTemplate
from typing import Dict, Any, List
from datetime import datetime
import asyncio

class SummarizerAgent:
    """Agent for summarizing content and responses"""
    
    def __init__(self, ollama_client):
        self.ollama_client = ollama_client
        self.agent_name = "Summarizer"
        self.status = "ready"
        
        # Summarization prompt templates
        self.summary_prompt = PromptTemplate(
            template="""
            Summarize the following content in a clear and concise manner:
            
            Content: {content}
            
            Summary:
            """,
            input_variables=["content"]
        )
        
        self.bullet_point_prompt = PromptTemplate(
            template="""
            Create a bullet-point summary of the following content:
            
            Content: {content}
            
            Key Points:
            """,
            input_variables=["content"]
        )
        
    async def summarize(self, content: str, summary_type: str = "paragraph") -> Dict[str, Any]:
        """Summarize content"""
        try:
            self.status = "processing"
            
            # Choose appropriate prompt
            if summary_type == "bullet_points":
                prompt = self.bullet_point_prompt
            else:
                prompt = self.summary_prompt
            
            # Generate summary
            summary = await self._generate_summary(content, prompt)
            
            # Post-process summary
            processed_summary = await self._post_process_summary(summary, summary_type)
            
            self.status = "ready"
            
            return {
                "summary": processed_summary,
                "original_length": len(content),
                "summary_length": len(processed_summary),
                "compression_ratio": len(processed_summary) / len(content) if content else 0,
                "summary_type": summary_type,
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name
            }
            
        except Exception as e:
            self.status = "error"
            raise Exception(f"Summarization error: {str(e)}")
    
    async def _generate_summary(self, content: str, prompt: PromptTemplate) -> str:
        """Generate summary using LLM"""
        try:
            # Format prompt
            formatted_prompt = prompt.format(content=content)
            
            # Generate summary
            response = await self.ollama_client.generate(
                model="mistral:latest",
                prompt=formatted_prompt,
                max_tokens=500,
                temperature=0.3  # Lower temperature for more focused summaries
            )
            
            return response.strip()
            
        except Exception as e:
            raise Exception(f"Summary generation failed: {str(e)}")
    
    async def _post_process_summary(self, summary: str, summary_type: str) -> str:
        """Post-process the generated summary"""
        # Clean up summary
        summary = summary.strip()
        
        # Remove unwanted prefixes
        if summary.startswith("Summary:"):
            summary = summary[8:].strip()
        elif summary.startswith("Key Points:"):
            summary = summary[11:].strip()
        
        # Format bullet points if needed
        if summary_type == "bullet_points" and not summary.startswith("•"):
            lines = summary.split('\n')
            formatted_lines = []
            for line in lines:
                line = line.strip()
                if line and not line.startswith("•") and not line.startswith("-"):
                    formatted_lines.append(f"• {line}")
                elif line:
                    formatted_lines.append(line)
            summary = '\n'.join(formatted_lines)
        
        return summary
    
    async def summarize_conversation(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize a conversation"""
        try:
            self.status = "processing"
            
            # Format conversation
            conversation_text = self._format_conversation(messages)
            
            # Create conversation summary prompt
            conv_prompt = """
            Summarize the following conversation between a user and an AI assistant:
            
            {conversation}
            
            Conversation Summary:
            """
            
            # Generate summary
            response = await self.ollama_client.generate(
                model="mistral:latest",
                prompt=conv_prompt.format(conversation=conversation_text),
                max_tokens=300,
                temperature=0.3
            )
            
            self.status = "ready"
            
            return {
                "conversation_summary": response.strip(),
                "message_count": len(messages),
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name
            }
            
        except Exception as e:
            self.status = "error"
            raise Exception(f"Conversation summarization error: {str(e)}")
    
    def _format_conversation(self, messages: List[Dict[str, Any]]) -> str:
        """Format conversation for summarization"""
        formatted = []
        for msg in messages:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            formatted.append(f"{role.capitalize()}: {content}")
        
        return "\n".join(formatted)
    
    async def extract_key_points(self, content: str) -> Dict[str, Any]:
        """Extract key points from content"""
        try:
            self.status = "processing"
            
            key_points_prompt = """
            Extract the key points from the following content:
            
            {content}
            
            Key Points (one per line):
            """
            
            response = await self.ollama_client.generate(
                model="mistral:latest",
                prompt=key_points_prompt.format(content=content),
                max_tokens=400,
                temperature=0.2
            )
            
            # Parse key points
            key_points = [point.strip() for point in response.split('\n') if point.strip()]
            
            self.status = "ready"
            
            return {
                "key_points": key_points,
                "total_points": len(key_points),
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name
            }
            
        except Exception as e:
            self.status = "error"
            raise Exception(f"Key points extraction error: {str(e)}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "last_activity": datetime.now().isoformat(),
            "capabilities": [
                "text_summarization",
                "bullet_point_generation",
                "conversation_summarization",
                "key_point_extraction"
            ],
            "summary_types": ["paragraph", "bullet_points", "key_points"]
        }
