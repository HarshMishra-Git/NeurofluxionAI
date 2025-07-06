import { useState, useCallback } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
  onVoiceMessage: (transcript: string) => void;
}

export function VoiceInput({ onVoiceMessage }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      // Check if the browser supports speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setIsSupported(false);
        toast({
          title: "Voice input not supported",
          description: "Your browser doesn't support speech recognition. Please use text input instead.",
          variant: "destructive"
        });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        toast({
          title: "Listening...",
          description: "Speak now, we're recording your message.",
        });
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onVoiceMessage(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast({
          title: "Voice recording failed",
          description: "There was an error with voice recognition. Please try again.",
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (error) {
      console.error('Voice input error:', error);
      setIsRecording(false);
      toast({
        title: "Voice input error",
        description: "Failed to start voice recording. Please try again.",
        variant: "destructive"
      });
    }
  }, [onVoiceMessage, toast]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    // In a real implementation, you would stop the actual recording here
    toast({
      title: "Recording stopped",
      description: "Voice recording has been stopped.",
    });
  }, [toast]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isSupported) {
    return (
      <Button variant="outline" size="sm" disabled>
        <MicOff className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      variant={isRecording ? "destructive" : "default"}
      size="sm"
      className={isRecording ? "animate-pulse" : "gradient-bg"}
    >
      {isRecording ? (
        <Square className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
}
