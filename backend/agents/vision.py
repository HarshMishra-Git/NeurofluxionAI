from typing import Dict, Any, Optional
from datetime import datetime
import asyncio
import base64
import io
from PIL import Image
import aiohttp
import pytesseract

class VisionAgent:
    """Vision agent for image analysis and OCR"""
    
    def __init__(self, ollama_client):
        self.ollama_client = ollama_client
        self.agent_name = "Vision"
        self.status = "ready"
        
    async def process_image(self, image_data: bytes, filename: str) -> Dict[str, Any]:
        """Process image for analysis"""
        try:
            self.status = "processing"
            
            # Convert image to base64 for processing
            image_b64 = base64.b64encode(image_data).decode()
            
            # Analyze image
            analysis = await self._analyze_image(image_b64, filename)
            
            # Extract text if present
            ocr_result = await self._extract_text(image_b64)
            
            # Generate description
            description = await self._generate_description(image_b64, analysis)
            
            self.status = "ready"
            
            return {
                "analysis": analysis,
                "ocr_result": ocr_result,
                "description": description,
                "filename": filename,
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name,
                "metadata": {
                    "image_size": len(image_data),
                    "processing_methods": ["analysis", "ocr", "description"]
                }
            }
            
        except Exception as e:
            self.status = "error"
            raise Exception(f"Vision processing error: {str(e)}")
    
    async def _analyze_image(self, image_b64: str, filename: str) -> Dict[str, Any]:
        """Analyze image using LLaVA model"""
        try:
            prompt = "List all objects you see in this image. Respond with a comma-separated list."
            payload = {
                "model": "llava:latest",
                "prompt": prompt,
                "images": [image_b64],
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "max_tokens": 100
                }
            }
            async with aiohttp.ClientSession() as session:
                async with session.post("http://localhost:11434/api/generate", json=payload) as resp:
                    data = await resp.json()
                    objects = [obj.strip() for obj in data.get("response", "").split(",") if obj.strip()]
                    return {
                        "objects_detected": objects,
                        "raw_response": data.get("response", "")
                    }
        except Exception as e:
            return {"error": str(e)}
    
    async def _extract_text(self, image_b64: str) -> Dict[str, Any]:
        """Extract text from image using OCR"""
        try:
            # Decode base64 to bytes and open as PIL image
            image_data = base64.b64decode(image_b64)
            image = Image.open(io.BytesIO(image_data))
            text = pytesseract.image_to_string(image)
            return {
                "text_found": bool(text.strip()),
                "extracted_text": text.strip(),
                "confidence": None  # Tesseract does not provide confidence by default
            }
        except Exception as e:
            return {
                "text_found": False,
                "error": str(e)
            }
    
    async def _generate_description(self, image_b64: str, analysis: Dict[str, Any]) -> str:
        """Generate natural language description of the image"""
        try:
            # Prepare the prompt for LLaVA
            prompt = "Describe this image in detail."
            payload = {
                "model": "llava:latest",
                "prompt": prompt,
                "images": [image_b64],
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "max_tokens": 200
                }
            }
            async with aiohttp.ClientSession() as session:
                async with session.post("http://localhost:11434/api/generate", json=payload) as resp:
                    data = await resp.json()
                    return data.get("response", "").strip()
        except Exception as e:
            return f"Image analysis failed: {str(e)}"
    
    async def identify_objects(self, image_data: bytes) -> Dict[str, Any]:
        """Identify specific objects in the image"""
        try:
            self.status = "processing"
            
            # Convert image
            image_b64 = base64.b64encode(image_data).decode()
            
            # Mock object detection
            await asyncio.sleep(0.8)
            
            objects = [
                {"name": "laptop", "confidence": 0.95, "bbox": [150, 100, 400, 300]},
                {"name": "coffee cup", "confidence": 0.87, "bbox": [450, 200, 500, 280]},
                {"name": "notebook", "confidence": 0.78, "bbox": [200, 350, 350, 450]}
            ]
            
            self.status = "ready"
            
            return {
                "objects": objects,
                "total_objects": len(objects),
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name
            }
            
        except Exception as e:
            self.status = "error"
            raise Exception(f"Object identification failed: {str(e)}")
    
    async def generate_caption(self, image_data: bytes) -> Dict[str, Any]:
        """Generate a caption for the image"""
        try:
            self.status = "processing"
            
            # Process image
            image_b64 = base64.b64encode(image_data).decode()
            
            # Generate caption using vision model
            caption_prompt = """
            Generate a brief, descriptive caption for this image. 
            Focus on the main subject and key details.
            """
            
            # In a real implementation, this would use LLaVA
            await asyncio.sleep(0.6)
            
            caption = "A person working on a laptop in a modern office setting with natural lighting."
            
            self.status = "ready"
            
            return {
                "caption": caption,
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name
            }
            
        except Exception as e:
            self.status = "error"
            raise Exception(f"Caption generation failed: {str(e)}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "last_activity": datetime.now().isoformat(),
            "capabilities": [
                "image_analysis",
                "object_detection",
                "text_extraction",
                "caption_generation",
                "scene_understanding"
            ],
            "supported_formats": ["jpg", "jpeg", "png", "webp", "bmp"],
            "models": ["llava:latest", "mistral:latest"]
        }
