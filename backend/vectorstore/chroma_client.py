import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime
import os
from .embed import embedding_service

class ChromaClient:
    """ChromaDB client for vector storage and retrieval"""
    
    def __init__(self, persist_directory: str = "./data/vector_store"):
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self.collection_name = "neurofluxion_docs"
        self.is_connected = False
        
    async def connect(self):
        """Initialize ChromaDB connection"""
        try:
            if not self.is_connected:
                # Ensure directory exists
                os.makedirs(self.persist_directory, exist_ok=True)
                
                # Initialize ChromaDB client
                self.client = chromadb.PersistentClient(
                    path=self.persist_directory,
                    settings=Settings(
                        anonymized_telemetry=False,
                        allow_reset=True
                    )
                )
                
                # Get or create collection
                self.collection = self.client.get_or_create_collection(
                    name=self.collection_name,
                    metadata={"description": "Neurofluxion AI document collection"}
                )
                
                self.is_connected = True
                
                # Ensure embedding service is loaded
                await embedding_service.load_model()
                
        except Exception as e:
            raise Exception(f"Failed to connect to ChromaDB: {str(e)}")
    
    async def add_document(self, content: str, metadata: Dict[str, Any], document_id: Optional[str] = None) -> str:
        """Add a document to the vector store"""
        if not self.is_connected:
            await self.connect()
        
        try:
            # Generate embedding
            embedding = await embedding_service.embed_text(content)
            
            # Generate document ID if not provided
            if not document_id:
                document_id = f"doc_{datetime.now().timestamp()}"
            
            # Add to collection
            await asyncio.get_event_loop().run_in_executor(
                None,
                self.collection.add,
                [embedding],
                [document_id],
                [metadata],
                [content]
            )
            
            return document_id
            
        except Exception as e:
            raise Exception(f"Failed to add document: {str(e)}")
    
    async def add_documents(self, documents: List[Dict[str, Any]]) -> List[str]:
        """Add multiple documents to the vector store"""
        if not self.is_connected:
            await self.connect()
        
        try:
            contents = [doc["content"] for doc in documents]
            metadatas = [doc.get("metadata", {}) for doc in documents]
            
            # Generate embeddings for all documents
            embeddings = await embedding_service.embed_texts(contents)
            
            # Generate document IDs
            document_ids = [
                doc.get("id", f"doc_{datetime.now().timestamp()}_{i}")
                for i, doc in enumerate(documents)
            ]
            
            # Add to collection
            await asyncio.get_event_loop().run_in_executor(
                None,
                self.collection.add,
                embeddings,
                document_ids,
                metadatas,
                contents
            )
            
            return document_ids
            
        except Exception as e:
            raise Exception(f"Failed to add documents: {str(e)}")
    
    async def search(self, query_text: str = None, query_embedding: List[float] = None, 
                    n_results: int = 5, metadata_filter: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        if not self.is_connected:
            await self.connect()
        
        try:
            # Generate embedding if not provided
            if query_embedding is None and query_text:
                query_embedding = await embedding_service.embed_text(query_text)
            
            if query_embedding is None:
                raise ValueError("Either query_text or query_embedding must be provided")
            
            # Perform search
            results = await asyncio.get_event_loop().run_in_executor(
                None,
                self.collection.query,
                [query_embedding],
                n_results,
                metadata_filter
            )
            
            # Format results
            formatted_results = []
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    "content": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "distance": results['distances'][0][i],
                    "id": results['ids'][0][i]
                })
            
            return formatted_results
            
        except Exception as e:
            raise Exception(f"Failed to search documents: {str(e)}")
    
    async def get_document(self, document_id: str) -> Dict[str, Any]:
        """Get a specific document by ID"""
        if not self.is_connected:
            await self.connect()
        
        try:
            results = await asyncio.get_event_loop().run_in_executor(
                None,
                self.collection.get,
                [document_id]
            )
            
            if not results['documents']:
                raise ValueError(f"Document {document_id} not found")
            
            return {
                "id": results['ids'][0],
                "content": results['documents'][0],
                "metadata": results['metadatas'][0]
            }
            
        except Exception as e:
            raise Exception(f"Failed to get document: {str(e)}")
    
    async def update_document(self, document_id: str, content: str = None, metadata: Dict[str, Any] = None) -> bool:
        """Update a document"""
        if not self.is_connected:
            await self.connect()
        
        try:
            update_data = {}
            
            if content:
                # Generate new embedding
                embedding = await embedding_service.embed_text(content)
                update_data["embeddings"] = [embedding]
                update_data["documents"] = [content]
            
            if metadata:
                update_data["metadatas"] = [metadata]
            
            update_data["ids"] = [document_id]
            
            await asyncio.get_event_loop().run_in_executor(
                None,
                self.collection.update,
                **update_data
            )
            
            return True
            
        except Exception as e:
            raise Exception(f"Failed to update document: {str(e)}")
    
    async def delete_document(self, document_id: str) -> bool:
        """Delete a document"""
        if not self.is_connected:
            await self.connect()
        
        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                self.collection.delete,
                [document_id]
            )
            return True
            
        except Exception as e:
            raise Exception(f"Failed to delete document: {str(e)}")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        if not self.is_connected:
            await self.connect()
        
        try:
            count = await asyncio.get_event_loop().run_in_executor(
                None,
                self.collection.count
            )
            
            return {
                "collection_name": self.collection_name,
                "document_count": count,
                "is_connected": self.is_connected,
                "persist_directory": self.persist_directory,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            raise Exception(f"Failed to get stats: {str(e)}")
    
    async def health_check(self) -> bool:
        """Check if ChromaDB is healthy"""
        try:
            if not self.is_connected:
                await self.connect()
            
            # Try to get collection count
            await asyncio.get_event_loop().run_in_executor(
                None,
                self.collection.count
            )
            
            return True
            
        except Exception:
            return False
    
    async def reset_collection(self) -> bool:
        """Reset the collection (delete all documents)"""
        if not self.is_connected:
            await self.connect()
        
        try:
            # Delete and recreate collection
            self.client.delete_collection(self.collection_name)
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "Neurofluxion AI document collection"}
            )
            
            return True
            
        except Exception as e:
            raise Exception(f"Failed to reset collection: {str(e)}")
