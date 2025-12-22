import { Annotation, User, VisualSuggestion } from '../types';

// In production: use relative /api (same origin)
// In development: use localhost:3001
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// User storage key
const USER_STORAGE_KEY = 'frame_note_user';

// ============ User API ============

export async function createUser(name: string): Promise<User> {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create user');
  }
  
  const user = await response.json();
  
  // Save to localStorage for persistence
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  
  return user;
}

export async function getUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE}/users/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}

// ============ Annotations API ============

export async function getAnnotations(videoId: string): Promise<Annotation[]> {
  try {
    const response = await fetch(`${API_BASE}/annotations/video/${videoId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch annotations');
    }
    
    const data = await response.json();
    
    // Transform from API format to frontend format
    return data.map((ann: any) => ({
      id: ann.id,
      videoId: ann.video_id,
      startTime: ann.start_time,
      endTime: ann.end_time,
      author: ann.author,
      text: ann.text,
      createdAt: new Date(ann.created_at).getTime(),
      type: ann.type,
      drawingData: ann.drawing_data,
      attachments: ann.attachments || [],
    }));
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return [];
  }
}

export async function saveAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt'> & { userId: string }): Promise<Annotation> {
  const response = await fetch(`${API_BASE}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: annotation.videoId,
      user_id: annotation.userId,
      start_time: annotation.startTime,
      end_time: annotation.endTime,
      text: annotation.text,
      type: annotation.type,
      drawing_data: annotation.drawingData,
      attachments: annotation.attachments,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to save annotation');
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    videoId: data.video_id,
    startTime: data.start_time,
    endTime: data.end_time,
    author: data.author,
    text: data.text,
    createdAt: new Date(data.created_at).getTime(),
    type: data.type,
    drawingData: data.drawing_data,
    attachments: data.attachments || [],
  };
}

export async function deleteAnnotation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/annotations/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete annotation');
  }
}

export async function updateAnnotation(
  id: string,
  updates: { startTime?: number; endTime?: number; text?: string }
): Promise<Annotation> {
  const response = await fetch(`${API_BASE}/annotations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start_time: updates.startTime,
      end_time: updates.endTime,
      text: updates.text,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update annotation');
  }

  const data = await response.json();

  return {
    id: data.id,
    videoId: data.video_id,
    startTime: data.start_time,
    endTime: data.end_time,
    author: data.author,
    text: data.text,
    createdAt: new Date(data.created_at).getTime(),
    type: data.type,
    drawingData: data.drawing_data,
    attachments: data.attachments || [],
  };
}

export async function clearAnnotations(videoId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/annotations/video/${videoId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to clear annotations');
  }
}

// ============ Export/Import API ============

export interface ExportData {
  exportVersion: string;
  exportedAt: string;
  videoHash: string;
  annotations: Array<{
    timestamp: string;
    startTime: number;
    endTime: number;
    author: { id: string; name: string };
    text: string;
    type: 'comment' | 'drawing';
    drawingData?: any;
    attachments: any[];
    createdAt: string;
  }>;
}

export async function exportAnnotations(videoId: string): Promise<ExportData> {
  const response = await fetch(`${API_BASE}/annotations/export/${videoId}`);
  
  if (!response.ok) {
    throw new Error('Failed to export annotations');
  }
  
  return await response.json();
}

export async function importAnnotations(
  videoHash: string, 
  annotations: ExportData['annotations'], 
  userId: string
): Promise<{ imported: number }> {
  const response = await fetch(`${API_BASE}/annotations/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoHash, annotations, userId }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to import annotations');
  }
  
  return await response.json();
}

// Helper to download export as file
export function downloadExportAsFile(data: ExportData, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `video-annotations-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============ Visual Suggestions API ============

export async function getVisualSuggestions(
  fullTranscript: string,
  selectionTranscript: string,
  selectionTimeRange: { start: number; end: number }
): Promise<VisualSuggestion[]> {
  const response = await fetch(`${API_BASE}/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullTranscript,
      selectionTranscript,
      selectionTimeRange,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get visual suggestions');
  }

  const data = await response.json();
  return data.suggestions;
}

