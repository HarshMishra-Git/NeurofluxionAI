from typing import Dict, Any, Optional
from datetime import datetime
import asyncio
import os
import tempfile
import base64

class TTSAgent:
    """Text-to-speech agent using local TTS engines"""
    
    def __init__(self):
        self.agent_name = "TTS"
        self.status = "ready"
        self.available_engines = ["piper", "coqui", "espeak"]
        self.current_engine = "coqui"  # Default engine is now coqui
        
    async def synthesize(self, text: str, voice: str = "default", speed: float = 1.0) -> Dict[str, Any]:
        """Synthesize text to speech"""
        try:
            self.status = "processing"
            
            # Clean text for TTS
            cleaned_text = self._clean_text_for_tts(text)
            
            # Generate audio
            audio_data = await self._generate_audio(cleaned_text, voice, speed)
            
            self.status = "ready"
            
            return {
                "audio_data": audio_data,
                "text": cleaned_text,
                "voice": voice,
                "speed": speed,
                "engine": self.current_engine,
                "timestamp": datetime.now().isoformat(),
                "agent_used": self.agent_name,
                "metadata": {
                    "text_length": len(cleaned_text),
                    "estimated_duration": self._estimate_duration(cleaned_text, speed)
                }
            }
            
        except Exception as e:
            self.status = "error"
            raise Exception(f"TTS synthesis error: {str(e)}")
    
    async def _generate_audio(self, text: str, voice: str, speed: float) -> str:
        """Generate audio using the selected TTS engine"""
        try:
            if self.current_engine == "piper":
                return await self._piper_synthesize(text, voice, speed)
            elif self.current_engine == "coqui":
                return await self._coqui_synthesize(text, voice, speed)
            elif self.current_engine == "espeak":
                return await self._espeak_synthesize(text, voice, speed)
            else:
                return await self._fallback_synthesize(text)
                
        except Exception as e:
            # Fallback to mock synthesis if engines fail
            return await self._fallback_synthesize(text)
    
    async def _piper_synthesize(self, text: str, voice: str, speed: float) -> str:
        """Synthesize using Piper TTS"""
        try:
            # In a real implementation, this would call Piper
            # For now, we'll simulate the process
            await asyncio.sleep(0.5)  # Simulate processing time
            
            # Create mock audio data (base64 encoded)
            mock_audio = b"MOCK_AUDIO_DATA_PIPER"
            return base64.b64encode(mock_audio).decode()
            
        except Exception as e:
            raise Exception(f"Piper TTS failed: {str(e)}")
    
    async def _coqui_synthesize(self, text: str, voice: str, speed: float) -> str:
        """Synthesize using Coqui TTS"""
        try:
            from TTS.api import TTS
            import soundfile as sf
            import io
            # You can change the model_name to any available Coqui TTS model
            tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)
            # Synthesize speech
            wav = tts.tts(text)
            buf = io.BytesIO()
            sf.write(buf, wav, 22050, format='WAV')
            audio_bytes = buf.getvalue()
            return base64.b64encode(audio_bytes).decode()
        except Exception as e:
            raise Exception(f"Coqui TTS failed: {str(e)}")
    
    async def _espeak_synthesize(self, text: str, voice: str, speed: float) -> str:
        """Synthesize using eSpeak"""
        try:
            # In a real implementation, this would call eSpeak
            await asyncio.sleep(0.3)  # Simulate processing time
            
            mock_audio = b"MOCK_AUDIO_DATA_ESPEAK"
            return base64.b64encode(mock_audio).decode()
            
        except Exception as e:
            raise Exception(f"eSpeak TTS failed: {str(e)}")
    
    async def _fallback_synthesize(self, text: str) -> str:
        """Fallback synthesis when all engines fail"""
        # Return mock audio data as fallback
        mock_audio = b"MOCK_AUDIO_DATA_FALLBACK"
        return base64.b64encode(mock_audio).decode()
    
    def _clean_text_for_tts(self, text: str) -> str:
        """Clean text for TTS processing"""
        # Remove markdown formatting
        text = text.replace("**", "")
        text = text.replace("*", "")
        text = text.replace("_", "")
        text = text.replace("`", "")
        
        # Remove URLs
        import re
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Clean up whitespace
        text = ' '.join(text.split())
        
        return text
    
    def _estimate_duration(self, text: str, speed: float) -> float:
        """Estimate audio duration in seconds"""
        # Rough estimation: average speaking rate is 150-200 words per minute
        words = len(text.split())
        base_duration = (words / 175) * 60  # 175 words per minute
        return base_duration / speed
    
    async def list_voices(self) -> Dict[str, Any]:
        """List available voices"""
        try:
            voices = {
                "piper": ["en-us-female", "en-us-male", "en-uk-female"],
                "coqui": ["jenny", "ljspeech", "vctk"],
                "espeak": ["en", "en-us", "en-uk"]
            }
            
            return {
                "voices": voices,
                "current_engine": self.current_engine,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            raise Exception(f"Voice listing failed: {str(e)}")
    
    async def set_engine(self, engine: str) -> Dict[str, Any]:
        """Set TTS engine"""
        if engine in self.available_engines:
            self.current_engine = engine
            return {
                "engine": engine,
                "status": "changed",
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise Exception(f"Engine {engine} not available")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "last_activity": datetime.now().isoformat(),
            "capabilities": [
                "text_to_speech",
                "voice_selection",
                "speed_control",
                "engine_switching"
            ],
            "current_engine": self.current_engine,
            "available_engines": self.available_engines
        }
