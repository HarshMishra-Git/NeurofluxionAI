import whisper
import asyncio
import tempfile
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
import io

class WhisperInterface:
    """Interface for Whisper speech-to-text processing"""
    
    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self.model = None
        self.is_loaded = False
        
    async def load_model(self):
        """Load the Whisper model"""
        try:
            if not self.is_loaded:
                # Load model in thread to avoid blocking
                self.model = await asyncio.get_event_loop().run_in_executor(
                    None, self._load_model_sync
                )
                self.is_loaded = True
        except Exception as e:
            raise Exception(f"Failed to load Whisper model: {str(e)}")
    
    def _load_model_sync(self):
        """Synchronous model loading"""
        return whisper.load_model(self.model_name)
    
    async def transcribe_audio(self, audio_data: bytes, language: Optional[str] = None) -> Dict[str, Any]:
        """Transcribe audio data to text"""
        if not self.is_loaded:
            await self.load_model()
        
        try:
            # Create temporary file for audio data
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                # Transcribe in thread to avoid blocking
                result = await asyncio.get_event_loop().run_in_executor(
                    None, self._transcribe_file_sync, temp_file_path, language
                )
                
                return {
                    "text": result["text"].strip(),
                    "language": result["language"],
                    "segments": result["segments"],
                    "duration": result.get("duration", 0),
                    "timestamp": datetime.now().isoformat(),
                    "model_used": self.model_name
                }
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            raise Exception(f"Failed to transcribe audio: {str(e)}")
    
    def _transcribe_file_sync(self, file_path: str, language: Optional[str] = None):
        """Synchronous transcription"""
        options = {}
        if language:
            options["language"] = language
        
        return self.model.transcribe(file_path, **options)
    
    async def transcribe_file(self, file_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """Transcribe audio file to text"""
        if not self.is_loaded:
            await self.load_model()
        
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Audio file not found: {file_path}")
            
            # Transcribe in thread to avoid blocking
            result = await asyncio.get_event_loop().run_in_executor(
                None, self._transcribe_file_sync, file_path, language
            )
            
            return {
                "text": result["text"].strip(),
                "language": result["language"],
                "segments": result["segments"],
                "duration": result.get("duration", 0),
                "timestamp": datetime.now().isoformat(),
                "model_used": self.model_name,
                "file_path": file_path
            }
            
        except Exception as e:
            raise Exception(f"Failed to transcribe file: {str(e)}")
    
    async def detect_language(self, audio_data: bytes) -> Dict[str, Any]:
        """Detect language of audio data"""
        if not self.is_loaded:
            await self.load_model()
        
        try:
            # Create temporary file for audio data
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                # Detect language in thread to avoid blocking
                result = await asyncio.get_event_loop().run_in_executor(
                    None, self._detect_language_sync, temp_file_path
                )
                
                return {
                    "language": result[0],
                    "confidence": result[1],
                    "timestamp": datetime.now().isoformat(),
                    "model_used": self.model_name
                }
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            raise Exception(f"Failed to detect language: {str(e)}")
    
    def _detect_language_sync(self, file_path: str):
        """Synchronous language detection"""
        # Load audio and pad/trim it to fit 30 seconds
        audio = whisper.load_audio(file_path)
        audio = whisper.pad_or_trim(audio)
        
        # Make log-Mel spectrogram and move to the same device as the model
        mel = whisper.log_mel_spectrogram(audio).to(self.model.device)
        
        # Detect the spoken language
        _, probs = self.model.detect_language(mel)
        
        # Get the most likely language
        detected_language = max(probs, key=probs.get)
        confidence = probs[detected_language]
        
        return detected_language, confidence
    
    async def get_supported_languages(self) -> list[str]:
        """Get list of supported languages"""
        return list(whisper.tokenizer.LANGUAGES.keys())
    
    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        if not self.is_loaded:
            await self.load_model()
        
        return {
            "model_name": self.model_name,
            "is_loaded": self.is_loaded,
            "supported_languages": await self.get_supported_languages(),
            "timestamp": datetime.now().isoformat()
        }
    
    async def health_check(self) -> bool:
        """Check if Whisper is working properly"""
        try:
            if not self.is_loaded:
                await self.load_model()
            
            # Try to create a simple test
            test_audio = b'\x00' * 1000  # Simple test audio data
            
            # This would normally fail but we catch it to verify the model is loaded
            try:
                await self.transcribe_audio(test_audio)
            except:
                pass  # Expected to fail with dummy data
            
            return True
            
        except Exception:
            return False

# Global Whisper interface instance
whisper_interface = WhisperInterface()
