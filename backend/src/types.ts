export interface User {
  id: string;
  name: string;
  created_at?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
}

export interface DrawingData {
  version: string;
  objects: any[];
}

export interface Annotation {
  id: string;
  video_id: string;
  user_id: string;
  start_time: number;
  end_time: number;
  text: string;
  type: 'comment' | 'drawing';
  drawing_data?: DrawingData | null;
  attachments: Attachment[];
  created_at?: string;
  // Populated when joining with users table
  author?: User;
}

// API response types
export interface AnnotationResponse extends Omit<Annotation, 'user_id'> {
  author: User;
}

// Export format
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
    drawingData?: DrawingData | null;
    attachments: Attachment[];
    createdAt: string;
  }>;
}

