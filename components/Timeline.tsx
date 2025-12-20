import React, { useState, useRef, useEffect } from 'react';
import { Annotation } from '../types';

interface TimelineProps {
  duration: number;
  currentTime: number;
  annotations: Annotation[];
  selectionRange: { start: number; end: number } | null;
  onSeek: (time: number) => void;
  onRangeSelect: (range: { start: number; end: number } | null) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ 
  duration, 
  currentTime, 
  annotations,
  selectionRange,
  onSeek,
  onRangeSelect
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [localHoverTime, setLocalHoverTime] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const getPercentageFromEvent = (e: React.MouseEvent) => {
    if (!timelineRef.current || duration === 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return x / rect.width;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const percent = getPercentageFromEvent(e);
    const time = percent * duration;
    setIsDragging(true);
    setDragStart(time);
    onRangeSelect(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const percent = getPercentageFromEvent(e);
    const time = percent * duration;
    setLocalHoverTime(time);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || dragStart === null) return;
    
    const percent = getPercentageFromEvent(e);
    const dragEnd = percent * duration;
    
    if (Math.abs(dragEnd - dragStart) < 0.5) {
      onSeek(dragEnd);
      onRangeSelect(null);
    } else {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      onRangeSelect({ start, end });
      onSeek(start);
    }

    setIsDragging(false);
    setDragStart(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = (currentTime / duration) * 100 || 0;
  
  const selectionStyle = useSelectionStyle(selectionRange, dragStart, localHoverTime, isDragging, duration);

  return (
    <div className="w-full h-14 flex flex-col justify-center px-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 select-none transition-colors">
      <div className="flex justify-between text-xs text-zinc-400 dark:text-zinc-500 mb-2 font-mono pointer-events-none">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      <div 
        ref={timelineRef}
        className="relative w-full h-6 flex items-center cursor-pointer group"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
            setIsDragging(false);
            setLocalHoverTime(null);
        }}
      >
        {/* Track Background */}
        <div className="absolute w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          {/* Played Progress */}
          <div 
            className="h-full bg-zinc-400/50 dark:bg-zinc-600/50"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Existing Annotation Markers */}
        {annotations.map((ann) => {
           const startPct = (ann.startTime / duration) * 100;
           const widthPct = ((ann.endTime - ann.startTime) / duration) * 100;
           const isRange = widthPct > 0.5;

           return isRange ? (
             <div 
                key={ann.id}
                className={`absolute h-1.5 top-1/2 -mt-0.75 z-10 opacity-60 pointer-events-none
                   ${ann.type === 'drawing' ? 'bg-emerald-500' : 'bg-yellow-500'}
                `}
                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
             />
           ) : (
             <div
                key={ann.id}
                className={`absolute w-1 h-3 rounded-full transform -translate-x-1/2 top-1/2 -mt-1.5 z-10 transition-all
                  ${ann.type === 'drawing' ? 'bg-emerald-500' : 'bg-yellow-500'}
                  group-hover:h-4 group-hover:z-20
                `}
                style={{ left: `${startPct}%` }}
              />
           );
        })}

        {/* Current Active Selection Range */}
        {selectionStyle && (
            <div 
                className="absolute h-full top-0 bg-purple-500/30 border-l border-r border-purple-500/50 pointer-events-none z-10"
                style={{ left: `${selectionStyle.left}%`, width: `${selectionStyle.width}%` }}
            />
        )}

        {/* Playhead */}
        <div 
          className="absolute w-3 h-3 bg-purple-600 dark:bg-white rounded-full shadow-md transform -translate-x-1/2 pointer-events-none z-30 ring-2 ring-white dark:ring-0"
          style={{ left: `${progressPercent}%` }}
        />
        
        {/* Playhead Line */}
        <div 
            className="absolute w-px h-6 bg-purple-600/50 dark:bg-white/50 transform -translate-x-1/2 pointer-events-none z-20"
            style={{ left: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

function useSelectionStyle(
    selectionRange: { start: number; end: number } | null,
    dragStart: number | null,
    localHoverTime: number | null,
    isDragging: boolean,
    duration: number
) {
    if (duration === 0) return null;

    let start = 0;
    let end = 0;

    if (isDragging && dragStart !== null && localHoverTime !== null) {
        start = Math.min(dragStart, localHoverTime);
        end = Math.max(dragStart, localHoverTime);
    } else if (selectionRange) {
        start = selectionRange.start;
        end = selectionRange.end;
    } else {
        return null;
    }

    const left = (start / duration) * 100;
    const width = ((end - start) / duration) * 100;

    return { left, width };
}