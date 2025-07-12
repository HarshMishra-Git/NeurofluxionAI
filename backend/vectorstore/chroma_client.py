import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime
import os
import numpy as np
from .embed import embedding_service
import shutil

class ChromaClient:
    """ChromaDB client for vector storage and retrieval"""
    
    def __init__(self, persist_directory: str = "./data/vector_store"):
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self.collection_name = "neurofluxion_docs"
        self.is_connected = False
        self.permanent_failure = False
        self._reset_attempted = False
        
    async def connect(self):
        """Initialize ChromaDB connection, with one-time auto-reset on failure"""
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
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
            print(f"[ChromaClient] Initial connect failed: {e}")
            if not self._reset_attempted:
                print("[ChromaClient] Attempting auto-reset of vector store directory...")
                self._reset_attempted = True
                try:
                    shutil.rmtree(self.persist_directory, ignore_errors=True)
                    os.makedirs(self.persist_directory, exist_ok=True)
                except Exception as cleanup_e:
                    print(f"[ChromaClient] Failed to clean vector store: {cleanup_e}")
                try:
                    self.client = chromadb.PersistentClient(
                        path=self.persist_directory,
                        settings=Settings(
                            anonymized_telemetry=False,
                            allow_reset=True
                        )
                    )
                    self.collection = self.client.get_or_create_collection(
                        name=self.collection_name,
                        metadata={"description": "Neurofluxion AI document collection"}
                    )
                    self.is_connected = True
                    await embedding_service.load_model()
                    print("[ChromaClient] Auto-reset and reconnect succeeded.")
                    return
                except Exception as retry_e:
                    print(f"[ChromaClient] Auto-reset and reconnect failed: {retry_e}")
            self.permanent_failure = True
            raise Exception(f"Failed to connect to ChromaDB after auto-reset: {str(e)}")
    
    def _ensure_collection(self):
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
        if self.collection is None:
            raise Exception("ChromaDB collection is not initialized. Call connect() first.")
    
    async def add_document(self, content: str, metadata: Dict[str, Any], document_id: Optional[str] = None, embedding: Optional[List[float]] = None) -> str:
        """Add a document to the vector store"""
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
        if not self.is_connected:
            await self.connect()
        self._ensure_collection()
        
        try:
            if embedding is None:
                embedding = await embedding_service.embed_text(content)
            if not document_id:
                document_id = f"doc_{datetime.now().timestamp()}"
            # Chroma expects embeddings as np.ndarray or List[float] for single doc
            emb = np.array(embedding, dtype=np.float32)
            if self.collection is None:
                raise Exception("ChromaDB collection is not initialized after connect().")
            self.collection.add(
                embeddings=[emb],
                ids=[document_id],
                metadatas=[metadata],
                documents=[content]
            )
            return document_id
            
        except Exception as e:
            raise Exception(f"Failed to add document: {str(e)}")
    
    async def add_documents(self, documents: List[Dict[str, Any]]) -> List[str]:
        """Add multiple documents to the vector store"""
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
        if not self.is_connected:
            await self.connect()
        self._ensure_collection()
        
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
            
            # Chroma expects embeddings as np.ndarray for batch
            embs = np.array(embeddings, dtype=np.float32)
            
            # Add to collection
            if self.collection is None:
                raise Exception("ChromaDB collection is not initialized after connect().")
            self.collection.add(
                embeddings=embs,
                ids=document_ids,
                metadatas=metadatas,
                documents=contents
            )
            
            return document_ids
            
        except Exception as e:
            raise Exception(f"Failed to add documents: {str(e)}")
    
    async def search(self, query_text: str = None, query_embedding: Optional[List[float]] = None, 
                    n_results: int = 5, metadata_filter: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
        if not self.is_connected:
            await self.connect()
        self._ensure_collection()
        
        try:
            # Generate embedding if not provided
            if query_embedding is None and query_text:
                query_embedding = await embedding_service.embed_text(query_text)
            
            if query_embedding is None:
                raise ValueError("Either query_text or query_embedding must be provided")
            
            # Chroma expects query_embeddings as np.ndarray or List[float]
            query_emb = np.array([query_embedding], dtype=np.float32)
            
            # Perform search
            if self.collection is None:
                raise Exception("ChromaDB collection is not initialized after connect().")
            results = self.collection.query(
                query_embeddings=query_emb,
                n_results=n_results,
                where=metadata_filter
            )
            
            # Format results
            formatted_results = []
            docs = results.get('documents', [[]])[0] if results and 'documents' in results and results['documents'] else []
            metas = results.get('metadatas', [[]])[0] if results and 'metadatas' in results and results['metadatas'] else []
            dists = results.get('distances', [[]])[0] if results and 'distances' in results and results['distances'] else []
            ids = results.get('ids', [[]])[0] if results and 'ids' in results and results['ids'] else []
            for i in range(len(docs)):
                formatted_results.append({
                    "content": docs[i],
                    "metadata": metas[i],
                    "distance": dists[i],
                    "id": ids[i]
                })
            
            return formatted_results
            
        except Exception as e:
            raise Exception(f"Failed to search documents: {str(e)}")
    
    async def get_document(self, document_id: str) -> Dict[str, Any]:
        """Get a specific document by ID"""
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
        if not self.is_connected:
            await self.connect()
        self._ensure_collection()
        try:
            if self.collection is None:
                raise Exception("ChromaDB collection is not initialized after connect().")
            results = self.collection.get(ids=[document_id])
            docs = results.get('documents') if results else None
            ids = results.get('ids') if results else None
            metas = results.get('metadatas') if results else None
            if not docs or not isinstance(docs, list) or not docs or not docs[0]:
                raise ValueError(f"Document {document_id} not found")
            return {
                "id": ids[0] if ids and isinstance(ids, list) and ids else None,
                "content": docs[0] if docs and isinstance(docs, list) and docs else None,
                "metadata": metas[0] if metas and isinstance(metas, list) and metas else None
            }
        except Exception as e:
            raise Exception(f"Failed to get document: {str(e)}")
    
    async def update_document(self, document_id: str, content: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Update a document"""
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
        if not self.is_connected:
            await self.connect()
        self._ensure_collection()
        try:
            update_data = {"ids": [document_id]}
            if content:
                # Generate new embedding
                embedding = await embedding_service.embed_text(content)
                emb = np.array(embedding, dtype=np.float32)
                update_data["embeddings"] = [emb]  # type: ignore
                update_data["documents"] = [content]
            if metadata:
                update_data["metadatas"] = [metadata]  # type: ignore
            if self.collection is None:
                raise Exception("ChromaDB collection is not initialized after connect().")
            self.collection.update(**update_data)  # type: ignore
            return True
        except Exception as e:
            raise Exception(f"Failed to update document: {str(e)}")
    
    async def delete_document(self, document_id: str) -> bool:
        """Delete a document"""
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
        if not self.is_connected:
            await self.connect()
        self._ensure_collection()
        
        try:
            if self.collection is None:
                raise Exception("ChromaDB collection is not initialized after connect().")
            self.collection.delete(ids=[document_id])
            return True
            
        except Exception as e:
            raise Exception(f"Failed to delete document: {str(e)}")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
        if not self.is_connected:
            await self.connect()
        self._ensure_collection()
        
        try:
            if self.collection is None:
                raise Exception("ChromaDB collection is not initialized after connect().")
            count = self.collection.count()
            
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
            self._ensure_collection()
            if self.collection is None:
                raise Exception("ChromaDB collection is not initialized after connect().")
            self.collection.count()
            
            return True
            
        except Exception:
            return False
    
    async def reset_collection(self) -> bool:
        """Reset the collection (delete all documents)"""
        if self.permanent_failure:
            raise Exception("ChromaClient is in a permanent failure state. Manual intervention required.")
        if not self.is_connected:
            await self.connect()
        self._ensure_collection()
        
        try:
            # Delete and recreate collection
            if self.client is None:
                raise Exception("ChromaDB client is not initialized after connect().")
            self.client.delete_collection(self.collection_name)
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "Neurofluxion AI document collection"}
            )
            
            return True
            
        except Exception as e:
            raise Exception(f"Failed to reset collection: {str(e)}")
