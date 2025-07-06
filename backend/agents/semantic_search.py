from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio

class SemanticSearchAgent:
    """Agent for semantic search using ChromaDB and embeddings"""
    
    def __init__(self, chroma_client):
        self.chroma_client = chroma_client
        self.agent_name = "SemanticSearch"
        self.status = "ready"
        
        # Initialize embeddings
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'}
        )
        
    async def search(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Perform semantic search"""
        try:
            self.status = "processing"
            
            # Get embeddings for query
            query_embedding = await self._get_query_embedding(query)
            
            # Search in vector database
            results = await self.chroma_client.search(
                query_embedding=query_embedding,
                n_results=5,
                metadata_filter=context.get("filters") if context else None
            )
            
            # Process and rank results
            processed_results = await self._process_search_results(results, query)
            
            self.status = "ready"
            
            return {
                "results": processed_results,
                "query": query,
                "search_type": "semantic",
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name,
                "metadata": {
                    "total_results": len(processed_results),
                    "confidence_scores": [r.get("confidence", 0) for r in processed_results]
                }
            }
            
        except Exception as e:
            self.status = "error"
            print(f"Semantic search failed: {str(e)}")
            # Return empty results to trigger fallback
            return {
                "results": [],
                "query": query,
                "search_type": "semantic_failed",
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name,
                "error": str(e),
                "metadata": {
                    "total_results": 0,
                    "confidence_scores": []
                }
            }
    
    async def _get_query_embedding(self, query: str) -> List[float]:
        """Get embedding for query"""
        try:
            # Run embedding in thread to avoid blocking
            embedding = await asyncio.get_event_loop().run_in_executor(
                None, self.embeddings.embed_query, query
            )
            return embedding
        except Exception as e:
            raise Exception(f"Embedding generation failed: {str(e)}")
    
    async def _process_search_results(self, results: List[Dict], query: str) -> List[Dict[str, Any]]:
        """Process and rank search results"""
        processed = []
        
        for result in results:
            processed_result = {
                "content": result.get("content", ""),
                "metadata": result.get("metadata", {}),
                "confidence": result.get("distance", 0),
                "relevance_score": self._calculate_relevance(result, query),
                "source": result.get("source", "unknown")
            }
            processed.append(processed_result)
        
        # Sort by relevance score
        processed.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return processed
    
    def _calculate_relevance(self, result: Dict, query: str) -> float:
        """Calculate relevance score for a search result"""
        # Simple relevance calculation
        # In a real implementation, this would be more sophisticated
        base_score = 1.0 - result.get("distance", 1.0)
        
        # Boost score based on metadata
        metadata = result.get("metadata", {})
        if metadata.get("document_type") == "primary":
            base_score *= 1.2
        
        return min(base_score, 1.0)
    
    async def add_document(self, content: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Add document to vector database"""
        try:
            # Generate embedding
            embedding = await self._get_query_embedding(content)
            
            # Add to ChromaDB
            doc_id = await self.chroma_client.add_document(
                content=content,
                embedding=embedding,
                metadata=metadata
            )
            
            return {
                "document_id": doc_id,
                "status": "added",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            raise Exception(f"Document addition failed: {str(e)}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "last_activity": datetime.now().isoformat(),
            "capabilities": [
                "semantic_search",
                "document_indexing",
                "embedding_generation",
                "relevance_ranking"
            ],
            "stats": await self.chroma_client.get_stats()
        }
