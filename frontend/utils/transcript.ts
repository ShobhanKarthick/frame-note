// VTT Transcript parsing utilities

export interface TranscriptCue {
  start: number;
  end: number;
  text: string;
}

/**
 * Parse VTT content into an array of cues
 */
export function parseVTT(vttContent: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  
  // Split by double newlines to get individual cues
  const blocks = vttContent.split('\n\n');
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    
    // Skip header and empty blocks
    if (lines.length < 2 || lines[0].includes('WEBVTT')) continue;
    
    // Find the line with timestamps (format: 00:00:00.000 --> 00:00:00.000)
    let timestampLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampLineIndex = i;
        break;
      }
    }
    
    if (timestampLineIndex === -1) continue;
    
    const timestampLine = lines[timestampLineIndex];
    const textLines = lines.slice(timestampLineIndex + 1);
    
    // Parse timestamps
    const [startStr, endStr] = timestampLine.split('-->').map(s => s.trim());
    const start = parseTimestamp(startStr);
    const end = parseTimestamp(endStr);
    
    // Combine text lines and clean up
    const text = textLines
      .join(' ')
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();
    
    if (text) {
      cues.push({ start, end, text });
    }
  }
  
  return cues;
}

/**
 * Parse VTT timestamp to seconds
 * Supports formats: HH:MM:SS.mmm or MM:SS.mmm
 */
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS.mmm
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  } else if (parts.length === 1) {
    // SS.mmm
    seconds = parseFloat(parts[0]);
  }
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get transcript text for a specific time range
 */
export function getTranscriptForRange(
  cues: TranscriptCue[], 
  start: number, 
  end: number
): string {
  const relevantCues = cues.filter(cue => {
    // Include cue if it overlaps with the range at all
    return cue.start < end && cue.end > start;
  });
  
  return relevantCues
    .map(cue => cue.text)
    .join(' ')
    .trim();
}

/**
 * Get the full transcript text
 */
export function getFullTranscript(cues: TranscriptCue[]): string {
  return cues
    .map(cue => cue.text)
    .join(' ')
    .trim();
}

/**
 * Fetch and parse VTT from a URL
 */
export async function fetchAndParseVTT(url: string): Promise<TranscriptCue[]> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    return parseVTT(text);
  } catch (error) {
    console.error('Error fetching VTT:', error);
    return [];
  }
}

