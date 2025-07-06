import aiohttp
import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import os

class OllamaClient:
    """Client for interacting with Ollama local LLM server"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.session = None
        self.available_models = []
        self.default_model = "mistral:latest"
        
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=300)  # 5 minute timeout
            )
        return self.session
    
    async def close(self):
        """Close the HTTP session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def health_check(self) -> bool:
        """Check if Ollama server is running"""
        try:
            session = await self._get_session()
            async with session.get(f"{self.base_url}/api/tags") as response:
                return response.status == 200
        except Exception:
            return False
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models"""
        try:
            session = await self._get_session()
            async with session.get(f"{self.base_url}/api/tags") as response:
                if response.status == 200:
                    data = await response.json()
                    self.available_models = data.get("models", [])
                    return self.available_models
                else:
                    raise Exception(f"Failed to list models: {response.status}")
        except Exception as e:
            raise Exception(f"Failed to connect to Ollama: {str(e)}")
    
    async def generate(self, model: str, prompt: str, max_tokens: int = 1000, 
                      temperature: float = 0.7, stream: bool = False) -> str:
        """Generate text using Ollama model"""
        try:
            session = await self._get_session()
            
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": stream,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                    "stop": ["\n\n\n", "Human:", "Assistant:"]
                }
            }
            
            async with session.post(f"{self.base_url}/api/generate", json=payload) as response:
                if response.status == 200:
                    if stream:
                        return await self._handle_stream_response(response)
                    else:
                        data = await response.json()
                        return data.get("response", "")
                else:
                    error_text = await response.text()
                    raise Exception(f"Generation failed: {response.status} - {error_text}")
                    
        except Exception as e:
            raise Exception(f"Failed to generate text: {str(e)}")
    
    async def _handle_stream_response(self, response: aiohttp.ClientResponse) -> str:
        """Handle streaming response from Ollama"""
        result = ""
        async for line in response.content:
            if line:
                try:
                    data = json.loads(line)
                    if "response" in data:
                        result += data["response"]
                    if data.get("done", False):
                        break
                except json.JSONDecodeError:
                    continue
        return result
    
    async def chat(self, model: str, messages: List[Dict[str, str]], 
                  temperature: float = 0.7, max_tokens: int = 1000) -> str:
        """Chat with Ollama model"""
        try:
            session = await self._get_session()
            
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            
            async with session.post(f"{self.base_url}/api/chat", json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("message", {}).get("content", "")
                else:
                    error_text = await response.text()
                    raise Exception(f"Chat failed: {response.status} - {error_text}")
                    
        except Exception as e:
            raise Exception(f"Failed to chat: {str(e)}")
    
    async def embed(self, model: str, prompt: str) -> List[float]:
        """Generate embeddings using Ollama model"""
        try:
            session = await self._get_session()
            
            payload = {
                "model": model,
                "prompt": prompt
            }
            
            async with session.post(f"{self.base_url}/api/embeddings", json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("embedding", [])
                else:
                    error_text = await response.text()
                    raise Exception(f"Embedding failed: {response.status} - {error_text}")
                    
        except Exception as e:
            raise Exception(f"Failed to generate embeddings: {str(e)}")
    
    async def pull_model(self, model: str) -> Dict[str, Any]:
        """Pull a model from Ollama registry"""
        try:
            session = await self._get_session()
            
            payload = {"name": model}
            
            async with session.post(f"{self.base_url}/api/pull", json=payload) as response:
                if response.status == 200:
                    return {"status": "success", "model": model}
                else:
                    error_text = await response.text()
                    raise Exception(f"Pull failed: {response.status} - {error_text}")
                    
        except Exception as e:
            raise Exception(f"Failed to pull model: {str(e)}")
    
    async def model_info(self, model: str) -> Dict[str, Any]:
        """Get information about a model"""
        try:
            session = await self._get_session()
            
            payload = {"name": model}
            
            async with session.post(f"{self.base_url}/api/show", json=payload) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise Exception(f"Model info failed: {response.status} - {error_text}")
                    
        except Exception as e:
            raise Exception(f"Failed to get model info: {str(e)}")
    
    async def delete_model(self, model: str) -> Dict[str, Any]:
        """Delete a model"""
        try:
            session = await self._get_session()
            
            payload = {"name": model}
            
            async with session.delete(f"{self.base_url}/api/delete", json=payload) as response:
                if response.status == 200:
                    return {"status": "deleted", "model": model}
                else:
                    error_text = await response.text()
                    raise Exception(f"Delete failed: {response.status} - {error_text}")
                    
        except Exception as e:
            raise Exception(f"Failed to delete model: {str(e)}")
    
    async def get_server_info(self) -> Dict[str, Any]:
        """Get Ollama server information"""
        try:
            models = await self.list_models()
            is_healthy = await self.health_check()
            
            return {
                "base_url": self.base_url,
                "is_healthy": is_healthy,
                "available_models": [m.get("name", "") for m in models],
                "total_models": len(models),
                "default_model": self.default_model,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "base_url": self.base_url,
                "is_healthy": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def ensure_model_available(self, model: str) -> bool:
        """Ensure a model is available, pull if necessary"""
        try:
            models = await self.list_models()
            model_names = [m.get("name", "") for m in models]
            
            if model in model_names:
                return True
            
            # Try to pull the model
            await self.pull_model(model)
            return True
            
        except Exception:
            return False

# Global Ollama client instance
ollama_client = OllamaClient()
