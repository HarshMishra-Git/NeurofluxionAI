import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Image, Mic, X, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  className?: string;
}

interface ProcessingFile {
  file: File;
  progress: number;
  id: string;
}

export function FileUpload({ className }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [lastVisionResult, setLastVisionResult] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data, file) => {
      toast({
        title: "File processed successfully",
        description: `${file.name} has been analyzed by the AI system.`,
      });
      
      // Remove from processing files
      setProcessingFiles(prev => prev.filter(pf => pf.file !== file));
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/agents/status'] });
      
      // If vision result, show it
      if (data.analysis || data.ocr_result || data.description) {
        setLastVisionResult(data);
      }
    },
    onError: (error, file) => {
      toast({
        title: "Upload failed",
        description: `Failed to process ${file.name}. Please try again.`,
        variant: "destructive"
      });
      
      // Remove from processing files
      setProcessingFiles(prev => prev.filter(pf => pf.file !== file));
    }
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    files.forEach(file => {
      // Validate file type
      const isValidType = file.type.startsWith('image/') || 
                         file.type.startsWith('audio/') || 
                         file.type === 'application/pdf' ||
                         file.type === 'text/plain';
      
      if (!isValidType) {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not a supported file type.`,
          variant: "destructive"
        });
        return;
      }

      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Maximum size is 50MB.`,
          variant: "destructive"
        });
        return;
      }

      // Add to processing files
      const processingFile: ProcessingFile = {
        file,
        progress: 0,
        id: Math.random().toString(36).substring(7)
      };
      
      setProcessingFiles(prev => [...prev, processingFile]);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProcessingFiles(prev => 
          prev.map(pf => 
            pf.id === processingFile.id 
              ? { ...pf, progress: Math.min(pf.progress + 10, 90) }
              : pf
          )
        );
      }, 200);

      // Upload the file
      uploadMutation.mutate(file, {
        onSettled: () => {
          clearInterval(progressInterval);
          setProcessingFiles(prev => 
            prev.map(pf => 
              pf.id === processingFile.id 
                ? { ...pf, progress: 100 }
                : pf
            )
          );
        }
      });
    });
  }, [uploadMutation, toast]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  }, [handleFiles]);

  const removeProcessingFile = useCallback((id: string) => {
    setProcessingFiles(prev => prev.filter(pf => pf.id !== id));
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-8 h-8" />;
    if (file.type.startsWith('audio/')) return <Mic className="w-8 h-8" />;
    return <FileText className="w-8 h-8" />;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Multi-Modal Input
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Image Upload */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <Image className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Upload Image for Analysis</p>
            <p className="text-xs text-muted-foreground">Drag & drop or click to browse</p>
            <p className="text-xs text-muted-foreground mt-2">Supports: JPG, PNG, WEBP</p>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Audio Upload */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('audio-upload')?.click()}
          >
            <Mic className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Upload Audio File</p>
            <p className="text-xs text-muted-foreground">Drag & drop or click to browse</p>
            <p className="text-xs text-muted-foreground mt-2">Supports: WAV, MP3, M4A</p>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>

        {/* Processing Queue */}
        {processingFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {processingFiles.map(({ file, progress, id }) => (
              <div key={id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <Progress value={progress} className="w-full mt-1" />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProcessingFile(id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Vision Result Panel */}
        {lastVisionResult && (
          <div className="mt-4 p-4 border rounded bg-muted">
            <h4 className="font-bold mb-2">Image Analysis Result</h4>
            <div><b>Description:</b> {lastVisionResult.description}</div>
            <div><b>Objects Detected:</b> {lastVisionResult.analysis?.objects_detected?.join(', ')}</div>
            <div><b>OCR Text:</b> {lastVisionResult.ocr_result?.extracted_text}</div>
            <Button size="sm" className="mt-2" onClick={() => setLastVisionResult(null)}>Close</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
