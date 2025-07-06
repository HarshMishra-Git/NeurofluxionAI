from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
import numpy as np
import asyncio
from datetime import datetime

class EmbeddingService:
    """Service for generating embeddings using local models"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.is_loaded = False
        
    async def load_model(self):
        """Load the embedding model"""
        try:
            if not self.is_loaded:
                # Load model in thread to avoid blocking
                self.model = await asyncio.get_event_loop().run_in_executor(
                    None, self._load_model_sync
                )
                self.is_loaded = True
        except Exception as e:
            raise Exception(f"Failed to load embedding model: {str(e)}")
    
    def _load_model_sync(self):
        """Synchronous model loading"""
        return SentenceTransformer(self.model_name)
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        if not self.is_loaded:
            await self.load_model()
        
        try:
            # Generate embedding in thread to avoid blocking
            embedding = await asyncio.get_event_loop().run_in_executor(
                None, self.model.encode, text
            )
            return embedding.tolist()
        except Exception as e:
            raise Exception(f"Failed to generate embedding: {str(e)}")
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if not self.is_loaded:
            await self.load_model()
        
        try:
            # Generate embeddings in thread to avoid blocking
            embeddings = await asyncio.get_event_loop().run_in_executor(
                None, self.model.encode, texts
            )
            return embeddings.tolist()
        except Exception as e:
            raise Exception(f"Failed to generate embeddings: {str(e)}")
    
    async def semantic_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity between two texts"""
        try:
            embeddings = await self.embed_texts([text1, text2])
            
            # Calculate cosine similarity
            emb1 = np.array(embeddings[0])
            emb2 = np.array(embeddings[1])
            
            similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
            return float(similarity)
        except Exception as e:
            raise Exception(f"Failed to calculate similarity: {str(e)}")
    
    async def find_most_similar(self, query: str, candidates: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        """Find most similar texts from candidates"""
        try:
            # Generate embeddings for all texts
            all_texts = [query] + candidates
            embeddings = await self.embed_texts(all_texts)
            
            query_embedding = np.array(embeddings[0])
            candidate_embeddings = np.array(embeddings[1:])
            
            # Calculate similarities
            similarities = []
            for i, candidate_embedding in enumerate(candidate_embeddings):
                similarity = np.dot(query_embedding, candidate_embedding) / (
                    np.linalg.norm(query_embedding) * np.linalg.norm(candidate_embedding)
                )
                similarities.append({
                    "text": candidates[i],
                    "similarity": float(similarity),
                    "index": i
                })
            
            # Sort by similarity and return top_k
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            return similarities[:top_k]
            
        except Exception as e:
            raise Exception(f"Failed to find similar texts: {str(e)}")
    
    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        if not self.is_loaded:
            await self.load_model()
        
        return {
            "model_name": self.model_name,
            "is_loaded": self.is_loaded,
            "max_sequence_length": getattr(self.model, 'max_seq_length', 512),
            "embedding_dimension": self.model.get_sentence_embedding_dimension() if self.model else None,
            "timestamp": datetime.now().isoformat()
        }

# Global embedding service instance
embedding_service = EmbeddingService()
