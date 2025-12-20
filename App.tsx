import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { VideoPlayer, VideoPlayerRef } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { Sidebar } from './components/Sidebar';
import { Button } from './components/ui/Button';
import { Annotation, DrawingPath, Attachment } from './types';
import { CURRENT_USER, getAnnotations, saveAnnotation } from './services/storage';
import { Pen, Upload, Play, Pause, MousePointer2, Moon, Sun, Captions, CaptionsOff, Trash2 } from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 15);

// Medblocks Logo Component
const MedblocksLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <rect x="4" y="4" width="10" height="10" rx="2" className="fill-blue-600" />
    <rect x="4" y="18" width="10" height="10" rx="2" className="fill-blue-600" />
    <rect x="18" y="18" width="10" height="10" rx="2" className="fill-blue-600" />
    <rect x="18" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2.5" className="text-blue-600" />
  </svg>
);

export default function App() {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Video State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [subtitleSrc, setSubtitleSrc] = useState<string | null>(null);
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // App Mode State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'pointer' | 'pen'>('pointer');
  
  // Selection State
  const [selectionRange, setSelectionRange] = useState<{start: number, end: number} | null>(null);

  // Data State
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load annotations when video loads
  useEffect(() => {
    if (videoSrc) {
      setTimeout(() => {
        setAnnotations(getAnnotations(videoSrc));
      }, 100);
    }
  }, [videoSrc]);

  // Handle Range Selection from Timeline
  const handleRangeSelect = (range: { start: number; end: number } | null) => {
      setSelectionRange(range);
      if (range) {
          setIsPlaying(false);
          setActiveAnnotationId(null); // Deselect specific comment if creating a new range
      }
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    videoPlayerRef.current?.seekTo(time);
    setCurrentTime(time);
  };

  const handleToolChange = (tool: 'pointer' | 'pen') => {
    setSelectedTool(tool);
    if (tool === 'pen') {
      setIsDrawingMode(true);
      setIsPlaying(false); 
      // Clear existing active drawing if we want to draw new stuff
      setActiveAnnotationId(null); 
      videoPlayerRef.current?.clearCanvas();
    } else {
      setIsDrawingMode(false);
    }
  };

  const clearCurrentDrawing = () => {
      videoPlayerRef.current?.clearCanvas();
  }

  const handleAddComment = (text: string, attachments: Attachment[]) => {
    if (!videoSrc) return;

    // Get Drawing Data from Fabric via Ref
    const currentDrawing = videoPlayerRef.current?.getCanvasJSON();

    // Determine Start/End
    let start = currentTime;
    let end = currentTime;

    if (selectionRange) {
        start = selectionRange.start;
        end = selectionRange.end;
    } else if (currentDrawing) {
        // If there is a drawing, default to 3 seconds or max duration
        end = Math.min(start + 1, duration);
    }

    const newAnnotation: Annotation = {
      id: generateId(),
      videoId: videoSrc,
      startTime: start,
      endTime: end,
      author: CURRENT_USER,
      text: text,
      createdAt: Date.now(),
      type: currentDrawing ? 'drawing' : 'comment',
      drawingData: currentDrawing || undefined, // Store the full Fabric JSON
      attachments: attachments
    };

    saveAnnotation(newAnnotation);
    setAnnotations(prev => [...prev, newAnnotation].sort((a, b) => a.startTime - b.startTime));
    
    // Select the new annotation and seek to its start to ensure it's visible immediately
    setActiveAnnotationId(newAnnotation.id);
    videoPlayerRef.current?.seekTo(start);
    setCurrentTime(start);
    setSelectionRange({ start, end });
    
    // Reset drawing mode
    if (selectedTool === 'pen') {
      handleToolChange('pointer');
    } else {
        // Clear the canvas if we just submitted a drawing
        videoPlayerRef.current?.clearCanvas();
    }
  };

  const handleAnnotationSelect = (ann: Annotation) => {
    setActiveAnnotationId(ann.id);
    setIsPlaying(false);
    videoPlayerRef.current?.seekTo(ann.startTime);
    setCurrentTime(ann.startTime);
    setSelectionRange({ start: ann.startTime, end: ann.endTime });
    
    // If in drawing mode, exit it to view the annotation
    if (isDrawingMode) {
        setSelectedTool('pointer');
        setIsDrawingMode(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setSubtitleSrc(null); 
      setAnnotations([]); 
      setIsPlaying(false);
      setCurrentTime(0);
      setSelectionRange(null);
    }
  };

  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.vtt')) {
      setSubtitleSrc(URL.createObjectURL(file));
      setIsCaptionsEnabled(true);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const vttContent = "WEBVTT\n\n" + content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        const blob = new Blob([vttContent], { type: 'text/vtt' });
        setSubtitleSrc(URL.createObjectURL(blob));
        setIsCaptionsEnabled(true);
      };
      reader.readAsText(file);
    }
  };

  // Determine what drawing to show based on current time
  // We use a two-step memoization to prevent activeDrawing from changing reference on every frame update
  
  // Small tolerance for time comparison (handles video frame alignment issues)
  const TIME_EPSILON = 0.1; // 100ms tolerance
  
  // Helper to check if current time is within annotation range (with tolerance)
  const isTimeInRange = useCallback((time: number, start: number, end: number) => {
    return time >= (start - TIME_EPSILON) && time <= (end + TIME_EPSILON);
  }, []);
  
  // 1. Calculate a unique signature for the currently visible annotations
  const visibleAnnotationIdsString = useMemo(() => {
    if (isDrawingMode) return "";
    
    // Priority: Explicit selection
    if (activeAnnotationId) {
        const activeAnn = annotations.find(a => a.id === activeAnnotationId);
        if (activeAnn?.drawingData && isTimeInRange(currentTime, activeAnn.startTime, activeAnn.endTime)) {
            return activeAnn.id;
        }
        return "";
    }

    // Fallback: All visible annotations
    return annotations
        .filter(ann => ann.drawingData && isTimeInRange(currentTime, ann.startTime, ann.endTime))
        .map(ann => ann.id)
        .sort()
        .join(',');
  }, [activeAnnotationId, annotations, currentTime, isDrawingMode, isTimeInRange]);

  // 2. Generate the drawing object only when the signature changes
  const activeDrawing = useMemo(() => {
      if (!visibleAnnotationIdsString) return null;
      
      const ids = visibleAnnotationIdsString.split(',');
      const visibleAnns = annotations.filter(a => ids.includes(a.id));
      
      if (visibleAnns.length === 0) return null;
      
      // If only one, return it directly to preserve original structure
      if (visibleAnns.length === 1) {
          return visibleAnns[0].drawingData || null;
      }

      // If multiple, merge their objects
      const combinedObjects = visibleAnns.flatMap(ann => ann.drawingData?.objects || []);
      
      return {
          version: "5.3.0",
          objects: combinedObjects
      };
  }, [visibleAnnotationIdsString, annotations]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors duration-300">
      
      {/* Navbar */}
      <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 shrink-0 z-30 transition-colors">
        <div className="flex items-center gap-4">
          <MedblocksLogo />
          <div>
             <h1 className="font-bold text-lg leading-tight tracking-tight text-zinc-900 dark:text-white">Medblocks</h1>
             <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Video Reviewer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {!videoSrc && (
            <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-200 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border border-zinc-200 dark:border-zinc-700">
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
              <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
          {videoSrc && (
             <>
             {!subtitleSrc ? (
                 <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border border-zinc-200 dark:border-zinc-700">
                    <Captions className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span className="hidden sm:inline">Add Captions</span>
                    <input type="file" accept=".vtt,.srt" className="hidden" onChange={handleSubtitleUpload} />
                 </label>
             ) : (
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsCaptionsEnabled(!isCaptionsEnabled)}
                        className={`p-1.5 rounded-md border transition-colors flex items-center gap-1.5 text-sm font-medium ${
                            isCaptionsEnabled 
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/50' 
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                    >
                        {isCaptionsEnabled ? <Captions className="w-4 h-4" /> : <CaptionsOff className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isCaptionsEnabled ? 'Captions On' : 'Captions Off'}</span>
                    </button>
                    
                    <label className="cursor-pointer p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 transition-colors">
                        <Upload className="w-4 h-4" /> 
                        <input type="file" accept=".vtt,.srt" className="hidden" onChange={handleSubtitleUpload} />
                    </label>
                </div>
             )}

             <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700/50">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Collaborating as {CURRENT_USER.name}</span>
             </div>
             </>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Editor Area */}
        <div className="flex-1 flex flex-col relative bg-zinc-50 dark:bg-zinc-950 transition-colors">
          
          {videoSrc ? (
            <>
              {/* Toolbar Overlay */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-zinc-200 dark:border-zinc-800 p-1.5 rounded-xl shadow-xl flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  active={selectedTool === 'pointer'}
                  onClick={() => handleToolChange('pointer')}
                  title="Select / Navigate"
                >
                  <MousePointer2 className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                <Button 
                  variant="ghost" 
                  size="icon"
                  active={selectedTool === 'pen'}
                  onClick={() => handleToolChange('pen')}
                  title="Draw Annotation (Pauses Video)"
                >
                  <Pen className="w-4 h-4" />
                </Button>
                
                {/* Additional controls when in drawing mode */}
                {isDrawingMode && (
                    <>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearCurrentDrawing}
                        title="Clear Canvas"
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    </>
                )}
              </div>

              {/* Video Container */}
              <div className="flex-1 min-h-0 relative">
                 <VideoPlayer
                    ref={videoPlayerRef}
                    src={videoSrc}
                    subtitleSrc={subtitleSrc}
                    isCaptionsEnabled={isCaptionsEnabled}
                    isPaused={!isPlaying}
                    currentTime={currentTime}
                    isDrawingMode={isDrawingMode}
                    activeDrawing={activeDrawing}
                    onTimeUpdate={handleTimeUpdate}
                    onDurationChange={setDuration}
                    togglePlay={togglePlay}
                 />
              </div>

              {/* Timeline Container */}
              <div className="shrink-0 z-20">
                <Timeline
                  duration={duration}
                  currentTime={currentTime}
                  annotations={annotations}
                  selectionRange={selectionRange}
                  onSeek={handleSeek}
                  onRangeSelect={handleRangeSelect}
                />
                
                {/* Playback Controls */}
                <div className="h-14 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 transition-colors">
                   <div className="flex items-center gap-2 w-1/3">
                      <Button variant="ghost" size="icon" onClick={togglePlay}>
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                      </Button>
                   </div>
                   <div className="w-1/3 text-center">
                     <span className="text-zinc-500 font-mono text-xs tracking-widest">
                        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} 
                        <span className="text-zinc-400 dark:text-zinc-600"> / </span> 
                        {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                     </span>
                   </div>
                   <div className="w-1/3 flex justify-end">
                      {/* Placeholder for volume/settings */}
                   </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-zinc-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 transition-colors">
               <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-800 shadow-xl">
                  <Upload className="w-10 h-10 text-zinc-400 dark:text-zinc-600" />
               </div>
               <h2 className="text-xl font-medium text-zinc-700 dark:text-zinc-300 mb-2">No Video Loaded</h2>
               <p className="text-sm max-w-xs text-center mb-8 text-zinc-500">
                 Upload a video file to start annotating, reviewing, and collaborating with your team.
               </p>
               <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full text-sm font-medium transition-all shadow-lg shadow-purple-900/20 hover:scale-105 active:scale-95 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Select Video File
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <Sidebar
          annotations={annotations}
          currentTime={currentTime}
          selectionRange={selectionRange}
          currentUser={CURRENT_USER}
          onAnnotationSelect={handleAnnotationSelect}
          onAddComment={handleAddComment}
          activeAnnotationId={activeAnnotationId || undefined}
          isDrawingMode={isDrawingMode}
        />
        
      </main>
    </div>
  );
}